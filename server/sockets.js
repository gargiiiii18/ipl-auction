import {Server} from "socket.io";
import { query } from "./db.js";
import { GameError, joinRoom, startLot, placeBid, closeLot } from "./game.js";

export function initSockets(httpServer){
    const io = new Server(httpServer, {
        cors: { origin: process.env.CORS_ORIGIN || "http://localhost:5173" },
    });

    // ── lot timers: one setTimeout per open lot, rescheduled whenever anti-snipe extends it ──
    const lotTimers = new Map();   //room_id -> Timeout

    function scheduleLotClose(roomId, closesAt){
        clearTimeout(lotTimers.get(roomId));   //reschedule = cancel the old timer + re-arm
        const ms = new Date(closesAt) - Date.now() + 250;   //small buffer past the deadline
        lotTimers.set(roomId, setTimeout(() => fireLotClose(roomId), Math.max(ms, 0)));
    }

    // flips the room to ended and announces final standings
    async function endAuction(roomId){
        await query(`UPDATE rooms SET status = 'ended' WHERE room_id = $1`, [roomId]);
        const participants = await query(
            `SELECT participant_id, team_name, budget
            FROM participants WHERE room_id = $1 ORDER BY budget DESC`,
            [roomId]
        );
        const squads = await query(
            `SELECT p.team_name, c.name AS cricketer, a.final_price
            FROM acquisitions a
            JOIN participants p ON p.participant_id = a.participant_id
            JOIN cricketers c ON c.cricketer_id = a.cricketer_id
            WHERE a.room_id = $1
            ORDER BY p.team_name, a.acquired_at`,
            [roomId]
        );
        io.to(`room:${roomId}`).emit("auction:ended", {participants, squads});
    }

    // timer expiry → settle the lot. closeLot's transaction makes double fires harmless.
    async function fireLotClose(roomId){
        lotTimers.delete(roomId);
        try {
            const result = await closeLot(roomId);
            if(!result) return;   //already settled — nothing to announce

            io.to(`room:${roomId}`).emit("lot:closed", result);

            //auction over? every cricketer is either sold (acquisitions) or unsold (unsold_cricketers),
            //OR the host-chosen auction size has been reached
            const [stats] = await query(
                `SELECT r.max_lots,
                    (SELECT COUNT(*)::int FROM cricketers c
                    WHERE NOT EXISTS (
                        SELECT 1 FROM acquisitions a
                        WHERE a.room_id = $1 AND a.cricketer_id = c.cricketer_id
                    )
                    AND NOT EXISTS (
                        SELECT 1 FROM unsold_cricketers u
                        WHERE u.room_id = $1 AND u.cricketer_id = c.cricketer_id
                    )) AS remaining,
                    (SELECT COUNT(*)::int FROM acquisitions a WHERE a.room_id = $1)
                    + (SELECT COUNT(*)::int FROM unsold_cricketers u WHERE u.room_id = $1) AS offered
                FROM rooms r WHERE r.room_id = $1`,
                [roomId]
            );
            if(stats && (stats.remaining === 0 || stats.offered >= stats.max_lots)) await endAuction(roomId);
        } catch (error) {
            console.error("lot close failed:", error);
        }
    }

    //attaching all handlers in one connection
    io.on("connection", (socket) => {
        console.log("Client connected:", socket.id);

        //room joining: accepts { code, teamName } (fresh participant) or
        //{ code, participantId } (re-attaching host/guest, e.g. after a refresh).
        //Game rules live in game.js (joinRoom); this handler only does socket work:
        //join the socket room, stamp server-derived identity, broadcast, ack.
        socket.on("room:join", async (payload = {}, callback) => {
            try {
                const {code, teamName, participantId} = payload;

                if(!code || (!teamName && !participantId)){
                    return callback?.({error: "code and teamName (or participantId) are required"});
                }

                const {room, participant, participants} = await joinRoom({code, teamName, participantId});

                socket.join(`room:${room.room_id}`);

                //stamping the participant identity on the socket sandbox —
                //identity always comes from the server here, never from client payloads
                socket.data.participant = participant;

                //timer recovery: if the server restarted mid-lot, the DB deadline survives —
                //re-arm from it (fires immediately if already past, which settles the lot)
                if(room.status === "live" && room.current_cricketer_id && !lotTimers.has(room.room_id)){
                    scheduleLotClose(room.room_id, room.lot_closes_at);
                }

                //if a lot is already open, include its state so late joiners can render it
                let lot = null;
                if(room.current_cricketer_id){
                    const [cricketer] = await query(
                        `SELECT * FROM cricketers WHERE cricketer_id = $1`,
                        [room.current_cricketer_id]
                    );
                    const [high] = await query(
                        `SELECT COALESCE(MAX(amount), 0) AS high FROM bids WHERE room_id = $1 AND cricketer_id = $2`,
                        [room.room_id, room.current_cricketer_id]
                    );
                    lot = { cricketer, highBid: Number(high.high), closesAt: room.lot_closes_at };
                }

                socket.to(`room:${room.room_id}`).emit("participant:joined", participant);
                callback?.({ok: true, room, participant, participants, lot});
            } catch (error) {
                if(error instanceof GameError){
                    return callback?.({error: error.message});
                }
                console.error(error);
                callback?.({error: "Something went wrong"});
            }
        });

        // ── host opens the next lot ──
        socket.on("lot:start", async (payload = {}, callback) => {
            try {
                const me = socket.data.participant;
                if(!me) return callback?.({error: "Join a room first"});
                if(!me.is_host) return callback?.({error: "Only the host can start lots"});

                const started = await startLot(me.room_id);
                if(started === null){
                    await endAuction(me.room_id);   //pool exhausted
                    return callback?.({ok: true, ended: true});
                }

                scheduleLotClose(me.room_id, started.room.lot_closes_at);
                io.to(`room:${me.room_id}`).emit("lot:started", started);
                callback?.({ok: true, cricketer: started.cricketer});
            } catch (error) {
                if(error instanceof GameError) return callback?.({error: error.message});
                console.error(error);
                callback?.({error: "Something went wrong"});
            }
        });

        // ── a participant bids. identity comes ONLY from socket.data (server-stamped) ──
        socket.on("bid:place", async (payload = {}, callback) => {
            try {
                const me = socket.data.participant;
                if(!me) return callback?.({error: "Join a room before bidding"});

                //transport-level pacing: a human doesn't bid twice in 300ms, a broken UI might
                const now = Date.now();
                if(socket.data.lastBidAt && now - socket.data.lastBidAt < 300){
                    return callback?.({error: "Slow down — wait for the current bid to register"});
                }
                socket.data.lastBidAt = now;

                const placed = await placeBid(me.room_id, me.participant_id, payload.amount);
                if(placed.extended) scheduleLotClose(me.room_id, placed.room.lot_closes_at);

                io.to(`room:${me.room_id}`).emit("bid:new", placed);
                callback?.({ok: true});
            } catch (error) {
                if(error instanceof GameError) return callback?.({error: error.message});
                console.error(error);
                callback?.({error: "Something went wrong"});
            }
        });

        socket.on("disconnect", (reason) => {
            //participants row is deliberately kept: a refresh reconnects via participantId
            console.log("client disconnected:", socket.id, reason);
        });
    });

    return io;
}