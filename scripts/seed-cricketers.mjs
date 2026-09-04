// REPLACES all game data with the CSV player pool (data/player-list.csv).
// Loud and deliberate: wipes rooms (cascading bids/acquisitions/participants) and cricketers.
// Validates every row first — aborts on ANY problem rather than importing garbage.
import fs from "fs";
import path from "path";
import { pool } from "../server/db.js";

const CSV_PATH = path.join(process.cwd(), "data", "player-list.csv");

const lines = fs.readFileSync(CSV_PATH, "utf8")
  .replace(/^\uFEFF/, "")   // strip Excel's UTF-8 BOM so the header check passes on re-saved files
  .split(/\r?\n/)
  .filter((l) => l.trim().length > 0);

const header = lines[0].split(",").map((s) => s.trim());
if (header.join("|") !== ["Player Name", "Base Price", "Category"].join("|")) {
  console.error("unexpected CSV header:", header);
  process.exit(1);
}

const players = [];
const problems = [];
for (const [i, line] of lines.slice(1).entries()) {
  const parts = line.split(",").map((s) => s.trim());
  if (parts.length !== 3) { problems.push(`line ${i + 2}: expected 3 fields, got ${parts.length}`); continue; }
  const [name, price, category] = parts;
  const base = Number(price);
  if (!name) { problems.push(`line ${i + 2}: missing name`); continue; }
  if (Number.isNaN(base) || base <= 0) { problems.push(`line ${i + 2}: bad base price "${price}"`); continue; }
  if (category !== "Indian" && category !== "Overseas") { problems.push(`line ${i + 2}: unknown category "${category}"`); continue; }
  players.push({ name, base, overseas: category === "Overseas" });
}
if (problems.length) {
  console.error(`CSV validation failed (${problems.length} rows):\n` + problems.join("\n"));
  process.exit(1);
}

// deliberate wipe — old test rooms cascade away with their bids/acquisitions/participants
await pool.query(`DELETE FROM rooms`);
await pool.query(`DELETE FROM cricketers`);

for (const p of players) {
  await pool.query(
    `INSERT INTO cricketers (name, role, base_price, is_overseas) VALUES ($1, NULL, $2, $3)`,
    [p.name, p.base, p.overseas]
  );
}
console.log(`seeded ${players.length} cricketers from CSV (role NULL until enriched; base prices in crores)`);
process.exit(0);
