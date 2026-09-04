import pg from "pg";
import "dotenv/config";

//pooler for connecting to the database
export const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

//helper function to replace template strings for preventing sql injections
export async function query(text, params = []){
    const result = await pool.query(text, params);
    return result.rows;
};