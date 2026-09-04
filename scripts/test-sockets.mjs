// Milestone 2 gate — scripted fake clients.
// Run with the server already up:  npm run server   (terminal 1)
//                                  node scripts/test-sockets.mjs   (terminal 2)
import { io } from "socket.io-client";

const URL = process.env.TEST_URL || "http://localhost:3000";
const log = (...a) => console.log(...a);

// connect + join; resolves with the ack (or rejects with { error })
function join(payload) {
  return new Promise((resolve, reject) => {
    const socket = io(URL, { transports: ["websocket"] });
    socket.on("connect", () => {
      socket.emit("room:join", payload, (res) =>
        res?.error ? reject(res) : resolve({ socket, res })
      );
    });
    socket.on("connect_error", (err) => reject({ error: err.message }));
  });
}

// 1. create a room over REST (Milestone 1 surface)
const createRes = await fetch(`${URL}/rooms`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "Socket Test", hostName: "Host" }),
});
if (!createRes.ok) {
  console.error("room creation failed:", createRes.status, await createRes.text());
  process.exit(1);
}
const { room, host } = await createRes.json();
log("1. room created:", room.room_code);

// 2. host attaches with their existing participant_id (must NOT create a row)
const hostJoined = await join({ code: room.room_code, participantId: host.participant_id });
log("2. host joined, participants:", hostJoined.res.participants.length);

// 3. a guest joins fresh (teamName path)
const guest = await join({ code: room.room_code, teamName: "Rivals" });
log("3. guest joined, participants:", guest.res.participants.length);

// 4. another client tries the SAME team name in the SAME room -> 23505 -> ack error
try {
  await join({ code: room.room_code, teamName: "Rivals" });
  log("4. FAIL: duplicate team name was allowed");
} catch (e) {
  log("4. OK, duplicate rejected:", e.error);
}

// 5. broadcasting: host listens, third participant joins
hostJoined.socket.on("participant:joined", (p) =>
  log("5. OK, host saw join:", p.team_name)
);
await join({ code: room.room_code, teamName: "Third Team" });
await new Promise((r) => setTimeout(r, 500)); // let the event land

// 6. bad room code / wrong-room participantId rejections
try {
  await join({ code: "ZZZZZZ", teamName: "Nobody" });
  log("6a. FAIL: bad room code accepted");
} catch (e) {
  log("6a. OK, bad code rejected:", e.error);
}
try {
  await join({ code: room.room_code, participantId: "00000000-0000-0000-0000-000000000000" });
  log("6b. FAIL: foreign participantId accepted");
} catch (e) {
  log("6b. OK, foreign participant rejected:", e.error);
}

process.exit(0);
