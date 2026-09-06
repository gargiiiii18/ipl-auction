import crypto from "crypto";
import { query, pool } from "./db.js";

//room code will be generated from alphabets and numerics
const CODE_ALPHA_NUMERIC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ23456789";

//game-rule violations the client can fix — message is safe to show as-is.
//internal anomalies (DB down, "impossible" states) keep plain Error / raw pg codes → 500.
export class GameError extends Error {}
//config knobs — env-overridable so tests can run fast auctions (LOT_DURATION_SECONDS=4 node server/index.js)
export const LOT_DURATION_SECONDS = Number(process.env.LOT_DURATION_SECONDS) || 20;
export const MIN_INCREMENT = 0.5;
export const ANTISNIPE_SECONDS = Number(process.env.ANTISNIPE_SECONDS) || 8;
//bids pressed before the deadline may arrive after it (network + processing latency).
//the server keeps accepting them for this long past lot_closes_at — otherwise a click
//at 0.2s-left gets rejected at 0.3s-past, which the user experiences as unfair
export const BID_GRACE_MS = Number(process.env.BID_GRACE_MS) || 1000;

// code generator function
function generateRoomCode(){
    const bytes = crypto.randomBytes(6);
    return Array.from(bytes, b => CODE_ALPHA_NUMERIC[b % CODE_ALPHA_NUMERIC.length]).join("");
};

// create a room and generate a room code for it. attempts if rare collision of room codes occur, which is denied at the database level by unique constraint
export async function createRoom({name, hostName, maxLots}){
    //auction size is the host's call; clamped here so a bad client can't create a 10,000-lot room
    const cappedMaxLots = Number.isInteger(maxLots) && maxLots >= 1 && maxLots <= 100 ? maxLots : 20;
    for(let attempt = 0; attempt<5; attempt++){
    try {
            const code = generateRoomCode();
            const [room] = await query(
                `INSERT INTO rooms (room_code, name, max_lots) VALUES ($1, $2, $3) RETURNING *`,
                [code, name, cappedMaxLots]
            );
            const [host] = await query(
                `INSERT INTO participants (room_id, team_name, is_host) VALUES ($1, $2, true) RETURNING *`,
                [room.room_id, hostName]
            );
            return {room, host};
    } catch (error) {
        if(error.code === "23505") continue;
        throw error;
    }
    }
    throw new Error("Could not generate a unique room code.");
};

// function for getting rooms by their room code and the participants
export async function getRoomByCode(code){
    const [room] = await query(
        `SELECT * FROM rooms WHERE room_code = $1`,
        [code.trim().toUpperCase()]
    );
    if(!room) return null;
    const participants
     = await query(
        `SELECT participant_id, team_name, budget, is_host, joined_at
        FROM participants WHERE room_id = $1 ORDER BY joined_at`,
        [room.room_id]
    );
    return {room, participants};
};

// ── joining (moved from sockets.js: game rules belong to the game layer) ──
// Accepts EITHER { code, teamName } for a fresh participant,
// OR { code, participantId } to re-attach an existing one (host attach / refresh reconnect).
// Throws GameError with user-safe messages; socket.js/REST only relay them.
export async function joinRoom({ code, teamName, participantId }){
    const found = await getRoomByCode(code);
    if(!found) throw new GameError("Room not found");
    const { room } = found;
    //ended rooms block fresh joins, but EXISTING participants may re-attach to view results
    if(!participantId && room.status === "ended") throw new GameError("This auction has ended");

    let participant;
    if(participantId){
        // re-attaching: verify the participant belongs to THIS room
        [participant] = await query(
            `SELECT * FROM participants WHERE participant_id = $1 AND room_id = $2`,
            [participantId, room.room_id]
        );
        if(!participant) throw new GameError("Participant not found in this room");
    } else {
        // fresh join — UNIQUE(room_id, team_name) is the bouncer
        try {
            [participant] = await query(
                `INSERT INTO participants (room_id, team_name) VALUES ($1, $2) RETURNING *`,
                [room.room_id, teamName]
            );
        } catch (error) {
            if(error.code === "23505"){
                throw new GameError("Team name already taken in this room");
            }
            throw error;
        }
    }

    const participants = await query(
        `SELECT participant_id, team_name, budget, is_host, joined_at
        FROM participants WHERE room_id = $1 ORDER BY joined_at`,
        [room.room_id]
    );
    return { room, participant, participants };
};

// ── lots (milestone 3) ──
// Picks the next unsold cricketer for THIS room and opens a lot with a server-owned deadline.
// Returns null when the pool is exhausted (caller announces auction end) — not an error.
export async function startLot(roomId){
    const [room] = await query(
        `SELECT * FROM rooms WHERE room_id = $1`,
        [roomId]
    );
    if(!room) throw new GameError("Room not found");
    if(room.status === "ended") throw new GameError("This auction has ended");
    if(room.current_cricketer_id) throw new GameError("A lot is already open");

    //next unsold cricketer for THIS room (each room auctions the pool independently);
    //excludes both sold (acquisitions) and unsold (unsold_cricketers) cricketers
    const [cricketer] = await query(
        `SELECT c.* FROM cricketers c
        WHERE NOT EXISTS (
            SELECT 1 FROM acquisitions a
            WHERE a.room_id = $1 AND a.cricketer_id = c.cricketer_id
        )
        AND NOT EXISTS (
            SELECT 1 FROM unsold_cricketers u
            WHERE u.room_id = $1 AND u.cricketer_id = c.cricketer_id
        )
        ORDER BY random() LIMIT 1`,
        [roomId]
    );
    if(!cricketer) return null;

    const [updated] = await query(
        `UPDATE rooms
        SET status = 'live', current_cricketer_id = $2,
            lot_closes_at = now() + make_interval(secs => $3)
        WHERE room_id = $1 RETURNING *`,
        [roomId, cricketer.cricketer_id, LOT_DURATION_SECONDS]
    );
    return { room: updated, cricketer };
};

// The validation ladder — runs inside a transaction with FOR UPDATE on the room row,
// so bidding and lot-settlement are fully serialized: a last-second bid either beats
// the hammer or gets a clean "lot has closed" — never a silent orphan.
export async function placeBid(roomId, participantId, amount){
    const client = await pool.connect();   //dedicated connection — required for transactions
    try {
        await client.query("BEGIN");

        //lock the room row; the JOIN pulls the cricketer in the same roundtrip
        const { rows: roomRows } = await client.query(
            `SELECT r.*, c.base_price
            FROM rooms r LEFT JOIN cricketers c ON c.cricketer_id = r.current_cricketer_id
            WHERE r.room_id = $1 FOR UPDATE OF r`,
            [roomId]
        );
        const room = roomRows[0];
        if(!room) { await client.query("ROLLBACK"); throw new GameError("Room not found"); }
        if(room.status !== "live") { await client.query("ROLLBACK"); throw new GameError("Auction is not live"); }
        if(!room.current_cricketer_id) { await client.query("ROLLBACK"); throw new GameError("No cricketer is on the block"); }
        if(new Date(room.lot_closes_at).getTime() + BID_GRACE_MS <= Date.now()) { await client.query("ROLLBACK"); throw new GameError("This lot has closed"); }

        //current high bid (MAX of zero rows is NULL → COALESCE to 0)
        const { rows: highRows } = await client.query(
            `SELECT COALESCE(MAX(amount), 0) AS high FROM bids WHERE room_id = $1 AND cricketer_id = $2`,
            [roomId, room.current_cricketer_id]
        );
        const highBid = Number(highRows[0].high);

        //the ladder — beat the high by MIN_INCREMENT, or open at base price
        const minimum = highBid > 0 ? highBid + MIN_INCREMENT : Number(room.base_price);
        if(Number(amount) < minimum) {
            await client.query("ROLLBACK");
            throw new GameError(`Bid must be at least ${minimum}`);
        }

        //budget
        const { rows: meRows } = await client.query(
            `SELECT budget FROM participants WHERE participant_id = $1`,
            [participantId]
        );
        if(!meRows[0]) { await client.query("ROLLBACK"); throw new GameError("Participant not found"); }
        if(Number(meRows[0].budget) < Number(amount)) {
            await client.query("ROLLBACK");
            throw new GameError("Bid exceeds your budget");
        }

        //upsert own bid — UNIQUE(room_id, cricketer_id, participant_id) means one bid row
        //per team per lot; the WHERE makes lowering your own bid match zero rows
        const { rows: bidRows } = await client.query(
            `INSERT INTO bids (room_id, cricketer_id, participant_id, amount)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (room_id, cricketer_id, participant_id)
            DO UPDATE SET amount = EXCLUDED.amount, created_at = now()
            WHERE bids.amount < EXCLUDED.amount
            RETURNING *`,
            [roomId, room.current_cricketer_id, participantId, amount]
        );
        if(!bidRows[0]) {
            await client.query("ROLLBACK");
            throw new GameError("Your new bid must be higher than your previous one");
        }

        //anti-snipe — late bids push the deadline out; socket layer reschedules.
        //inside the lock, so it can never extend an already-settled lot
        const msLeft = new Date(room.lot_closes_at) - Date.now();
        const extended = msLeft < ANTISNIPE_SECONDS * 1000;
        let currentRoom = room;
        if(extended){
            const { rows: upRows } = await client.query(
                `UPDATE rooms SET lot_closes_at = now() + make_interval(secs => $2)
                WHERE room_id = $1 RETURNING *`,
                [roomId, ANTISNIPE_SECONDS]
            );
            currentRoom = upRows[0];
        }

        await client.query("COMMIT");
        return { bid: bidRows[0], previousHigh: highBid, extended, room: currentRoom };
    } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
    } finally {
        client.release();   //ALWAYS return the connection to the pool, even on throw
    }
};

// Settles the open lot atomically: winner into acquisitions, budget deducted, lot cleared —
// all or nothing. FOR UPDATE locks the room row so two simultaneous closes can't both pay.
export async function closeLot(roomId){
    const client = await pool.connect();   //dedicated connection — required for transactions
    try {
        await client.query("BEGIN");

        const { rows: roomRows } = await client.query(
            `SELECT * FROM rooms WHERE room_id = $1 FOR UPDATE`,
            [roomId]
        );
        const room = roomRows[0];
        if(!room || !room.current_cricketer_id){
            await client.query("ROLLBACK");
            return null;   //nothing open — already closed (benign, e.g. double timer fire)
        }

        const { rows: bidRows } = await client.query(
            `SELECT b.*, p.team_name FROM bids b
            JOIN participants p ON p.participant_id = b.participant_id
            WHERE b.room_id = $1 AND b.cricketer_id = $2
            ORDER BY b.amount DESC LIMIT 1`,
            [roomId, room.current_cricketer_id]
        );

        let result;
        if(bidRows.length === 0){
            //record the unsold outcome so the cricketer isn't re-auctioned forever
            await client.query(
                `INSERT INTO unsold_cricketers (room_id, cricketer_id) VALUES ($1, $2)`,
                [roomId, room.current_cricketer_id]
            );
            result = { sold: false, cricketer_id: room.current_cricketer_id };
        } else {
            const winner = bidRows[0];
            await client.query(
                `INSERT INTO acquisitions (room_id, cricketer_id, participant_id, final_price)
                VALUES ($1, $2, $3, $4)`,
                [roomId, room.current_cricketer_id, winner.participant_id, winner.amount]
            );
            await client.query(
                `UPDATE participants SET budget = budget - $2 WHERE participant_id = $1`,
                [winner.participant_id, winner.amount]
            );
            result = {
                sold: true,
                cricketer_id: room.current_cricketer_id,
                participant_id: winner.participant_id,
                team_name: winner.team_name,
                final_price: Number(winner.amount),
            };
        }

        //cricketer name for the broadcast payload
        const { rows: nameRows } = await client.query(
            `SELECT name FROM cricketers WHERE cricketer_id = $1`,
            [room.current_cricketer_id]
        );
        result.cricketer_name = nameRows[0]?.name;

        await client.query(
            `UPDATE rooms SET current_cricketer_id = NULL, lot_closes_at = NULL WHERE room_id = $1`,
            [roomId]
        );

        await client.query("COMMIT");
        return result;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();   //ALWAYS return the connection to the pool, even on throw
    }
};

// final standings — used by the UI's ended view (re-attachers missed the broadcast)
export async function getRoomStandings(code){
    const found = await getRoomByCode(code);
    if(!found) throw new GameError("Room not found");
    const { room } = found;
    const participants = await query(
        `SELECT participant_id, team_name, budget, is_host
        FROM participants WHERE room_id = $1 ORDER BY budget DESC, joined_at`,
        [room.room_id]
    );
    const squads = await query(
        `SELECT p.participant_id, p.team_name, c.name AS cricketer, a.final_price, c.is_overseas
        FROM acquisitions a
        JOIN participants p ON p.participant_id = a.participant_id
        JOIN cricketers c ON c.cricketer_id = a.cricketer_id
        WHERE a.room_id = $1
        ORDER BY p.team_name, a.acquired_at`,
        [room.room_id]
    );
    return { room, participants, squads };
};