// Milestone 3 game-layer smoke test — drives game.js functions directly (no sockets).
// Run:  node scripts/test-auction-core.mjs
import { createRoom, joinRoom, startLot, placeBid, closeLot } from "../server/game.js";
import { query } from "../server/db.js";

const log = (...a) => console.log(...a);
const expectFail = async (label, fn, match) => {
  try {
    await fn();
    log(`${label} — FAIL: expected rejection`);
  } catch (e) {
    if (e instanceof Error && e.constructor.name === "GameError" && (!match || e.message.includes(match))) {
      log(`${label} — OK: ${e.message}`);
    } else {
      log(`${label} — FAIL: wrong error:`, e.message);
    }
  }
};

// 0. make sure the cricketer pool exists
const [{ count }] = await query(`SELECT COUNT(*)::int AS count FROM cricketers`);
if (count === 0) {
  await query(
    `INSERT INTO cricketers (name, role, base_price) VALUES
     ('A. Storm','batsman',5),('B. Rivers','bowler',3),('C. Meadow','all-rounder',4),('D. Falcon','keeper',2)`
  );
  log("0. seeded 4 cricketers");
} else {
  log(`0. pool already has ${count} cricketers`);
}

// 1. room + two bidding teams
const { room, host } = await createRoom({ name: "Core Test", hostName: "Host" });
const a = await joinRoom({ code: room.room_code, teamName: "TeamA" });
const b = await joinRoom({ code: room.room_code, teamName: "TeamB" });
log(`1. room ${room.room_code} — host + TeamA + TeamB joined`);

// 2. open the first lot
const lot = await startLot(room.room_id);
log(`2. lot open: ${lot.cricketer.name} (${lot.cricketer.role}), base price ${lot.cricketer.base_price}`);

// 3. can't open a second lot while one is live
await expectFail("3. double startLot", () => startLot(room.room_id), "already open");

const base = Number(lot.cricketer.base_price);
const A = a.participant.participant_id;
const B = b.participant.participant_id;

// 4. opening bid below base price
await expectFail("4. below base price", () => placeBid(room.room_id, A, base - 1), "at least");

// 5. valid opening bid at exactly base price
const r1 = await placeBid(room.room_id, A, base);
log(`5. opening bid OK: TeamA @ ${r1.bid.amount}`);

// 6. bid that doesn't clear the +0.5 increment
await expectFail("6. insufficient increment", () => placeBid(room.room_id, B, base + 0.25), "at least");

// 7. bid over budget (budget is 100)
await expectFail("7. over budget", () => placeBid(room.room_id, B, 150), "budget");

// 8. valid outbid: base + 0.5
const r2 = await placeBid(room.room_id, B, base + 0.5);
log(`8. outbid OK: TeamB @ ${r2.bid.amount} (previous high ${r2.previousHigh}, anti-snipe extended: ${r2.extended})`);

// 9. settle
const closed = await closeLot(room.room_id);
log(`9. lot closed: sold=${closed.sold}, winner=${closed.team_name} @ ${closed.final_price} for ${closed.cricketer_name}`);

// 10. budgets actually deducted
const budgets = await query(
  `SELECT team_name, budget FROM participants WHERE room_id = $1 ORDER BY team_name`, [room.room_id]
);
log("10. budgets:", budgets.map(p => `${p.team_name}=${p.budget}`).join(", "));
const teamB = budgets.find(p => p.team_name === "TeamB");
console.log(teamB && Number(teamB.budget) === 100 - Number(closed.final_price)
  ? "10b. OK: budget deducted correctly"
  : "10b. FAIL: budget mismatch");

// 11. double close is a benign no-op
const again = await closeLot(room.room_id);
log(`11. re-close returned: ${again} (expected null)`);

// 12. a lot nobody bids on → unsold
const lot2 = await startLot(room.room_id);
const closed2 = await closeLot(room.room_id);
log(`12. unsold lot: sold=${closed2.sold}, cricketer=${closed2.cricketer_name} (expected sold=false)`);

// 13. status check
const [roomNow] = await query(`SELECT status, current_cricketer_id, lot_closes_at FROM rooms WHERE room_id = $1`, [room.room_id]);
log(`13. room after two lots: status=${roomNow.status}, open lot=${roomNow.current_cricketer_id}, deadline=${roomNow.lot_closes_at}`);

process.exit(0);
