// one-time migration — records cricketers that went unsold in a room, so they are
// not re-auctioned forever and the pool can actually be exhausted
import { pool } from "../server/db.js";

await pool.query(`
    CREATE TABLE IF NOT EXISTS unsold_cricketers (
        room_id      uuid NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
        cricketer_id integer NOT NULL REFERENCES cricketers(cricketer_id),
        marked_at    timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (room_id, cricketer_id)
    );
`);
console.log("unsold_cricketers table ready");
process.exit(0);
