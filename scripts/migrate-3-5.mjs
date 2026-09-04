// Milestone 3.5 schema changes — recorded as code, never hand-run in a dashboard:
// 1. cricketers.is_overseas  — the CSV carries Indian/Overseas (real IPL squad rule)
// 2. cricketers.role nullable — the CSV has no role data; enrich later, display "—" meanwhile
// 3. rooms.max_lots          — host-chosen auction size (a 336-player pool is unplayable in one room)
import { pool } from "../server/db.js";

await pool.query(`ALTER TABLE cricketers ADD COLUMN IF NOT EXISTS is_overseas boolean NOT NULL DEFAULT false`);
await pool.query(`ALTER TABLE cricketers ALTER COLUMN role DROP NOT NULL`);
await pool.query(`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS max_lots integer NOT NULL DEFAULT 20`);
console.log("migration 3.5 applied: is_overseas, role nullable, rooms.max_lots");
process.exit(0);
