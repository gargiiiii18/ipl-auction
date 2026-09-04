// Milestone 3 end-to-end test — full auction over sockets.
// Start a fast server first (terminal 1):
//   $env:PORT="3100"; $env:LOT_DURATION_SECONDS="4"; $env:ANTISNIPE_SECONDS="2"; node server/index.js
// Then (terminal 2):
//   $env:TEST_URL="http://localhost:3100"; node scripts/test-auction.mjs
import { io } from "socket.io-client";

const URL = process.env.TEST_URL || "http://localhost:3000";
const log = (...a) => console.log(...a);
let failures = 0;
const check = (cond, label, extra = "") => {
  log(`${cond ? "✅" : "❌"} ${label}${extra ? " — " + extra : ""}`);
  if (!cond) failures++;
};

const connect = () =>
  new Promise((resolve, reject) => {
    const socket = io(URL, { transports: ["websocket"] });
    socket.on("connect", () => resolve(socket));
    socket.on("connect_error", (e) => reject(e));
  });
const emitAck = (socket, event, payload = {}) =>
  new Promise((resolve) => socket.emit(event, payload, (res) => resolve(res || {})));
const waitFor = (socket, event, ms = 15000) =>
  new Promise((resolve) => {
    const t = setTimeout(() => resolve(null), ms);
    socket.once(event, (data) => { clearTimeout(t); resolve(data); });
  });

// 1. room + three clients — host caps the auction at 4 lots
const createRes = await fetch(`${URL}/rooms`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "E2E Auction", hostName: "Host", maxLots: 4 }),
});
const { room, host } = await createRes.json();
check(room.max_lots === 4, "room created with host-chosen size", `max_lots=${room.max_lots}`);

const hostSock = await connect();
const aSock = await connect();
const bSock = await connect();
log(`room ${room.room_code} created, 3 sockets connected`);

const h = await emitAck(hostSock, "room:join", { code: room.room_code, participantId: host.participant_id });
const a = await emitAck(aSock, "room:join", { code: room.room_code, teamName: "TeamA" });
const b = await emitAck(bSock, "room:join", { code: room.room_code, teamName: "TeamB" });
check(h.ok && a.ok && b.ok, "host + TeamA + TeamB joined");

const A = a.participant.participant_id;
const B = b.participant.participant_id;
let soldCount = 0;
const spent = {};

// register EARLY — auction:ended fires right after lot 4's close, before we'd think to listen
const endedP = new Promise((resolve) => aSock.on("auction:ended", resolve));

// 2. guest cannot start lots
const sneak = await emitAck(aSock, "lot:start", {});
check(sneak.error === "Only the host can start lots", "guest blocked from lot:start", sneak.error);

// 3. play all four lots
for (let lotNo = 1; lotNo <= 4; lotNo++) {
  const startedP = waitFor(aSock, "lot:started");
  const hs = await emitAck(hostSock, "lot:start", {});
  if (hs.ended) { log("pool exhausted early (extra lots?)"); break; }
  const started = await startedP;
  check(!!started?.cricketer, `lot ${lotNo}: lot:started broadcast`, started?.cricketer?.name);
  const base = Number(started.cricketer.base_price);

  // low bid rejected (note: even rejected attempts consume the 300ms pacing window)
  const low = await emitAck(aSock, "bid:place", { amount: base - 1 });
  check(!!low.error, `lot ${lotNo}: low bid rejected`, low.error);
  await new Promise((r) => setTimeout(r, 350));

  if (lotNo === 3) {
    // nobody bids this lot → unsold
    const unsold = await waitFor(aSock, "lot:closed");
    check(unsold?.sold === false, `lot ${lotNo}: closed unsold`, unsold?.cricketer_name);
    continue;
  }

  // opening bid → broadcast seen by the OTHER client
  const bidP = waitFor(bSock, "bid:new");
  await emitAck(aSock, "bid:place", { amount: base });
  const bid1 = await bidP;
  check(bid1?.bid && Number(bid1.bid.amount) === base, `lot ${lotNo}: bid:new broadcast`, `TeamA @ ${base}`);

  // outbid unless last lot (keep it simple)
  let winnerId = A;
  if (lotNo !== 4) {
    const outbidP = waitFor(aSock, "bid:new");
    await emitAck(bSock, "bid:place", { amount: base + 0.5 });
    await outbidP;
    winnerId = B;
  }

  // timer fires → settled
  const closed = await waitFor(aSock, "lot:closed");
  check(closed?.sold === true && closed.participant_id === winnerId,
    `lot ${lotNo}: settled`, closed && `${closed.team_name} @ ${closed.final_price} for ${closed.cricketer_name}`);

  // only WINNING bids cost money
  if (closed?.sold) {
    soldCount++;
    spent[closed.participant_id] = (spent[closed.participant_id] || 0) + Number(closed.final_price);
  }
}

// 4. cap reached after lot 4 → auction:ended broadcast (listener registered early)
const ended = await endedP;
check(!!ended?.participants, "auction:ended broadcast with standings");
check(ended?.squads?.length === soldCount, "final squads match sold lots", `${ended?.squads?.length ?? 0} acquisitions (${soldCount} sold, ${4 - soldCount} unsold)`);

// 5. budgets = 100 minus winnings (only WINNING bids cost money)
const budgetOf = (id) => Number(ended?.participants?.find((p) => p.participant_id === id)?.budget);
check(budgetOf(A) === 100 - (spent[A] || 0), "TeamA final budget correct", `budget=${budgetOf(A)}, spent=${spent[A] || 0}`);
check(budgetOf(B) === 100 - (spent[B] || 0), "TeamB final budget correct", `budget=${budgetOf(B)}, spent=${spent[B] || 0}`);

// 6. ended room: lot:start rejected, host re-attach allowed, fresh join still rejected
const afterEnd = await emitAck(hostSock, "lot:start", {});
check(afterEnd.error === "This auction has ended", "lot:start rejected on ended room", afterEnd.error);
const reattach = await emitAck(hostSock, "room:join", { code: room.room_code, participantId: host.participant_id });
check(reattach.ok, "host re-attaches to ended room (view standings)");
const late = await emitAck(bSock, "room:join", { code: room.room_code, teamName: "Latecomer" });
check(late.error === "This auction has ended", "ended room still rejects fresh joins", late.error);

log(failures === 0 ? "\n🏆 ALL CHECKS PASSED" : `\n💥 ${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
