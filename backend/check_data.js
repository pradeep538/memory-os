
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    user: process.env.USER,
    host: 'localhost',
    database: 'memory_os',
    password: process.env.PGPASSWORD,
    port: 5432,
});

async function check() {
    try {
        const res = await pool.query("SELECT raw_input, normalized_data FROM memory_units WHERE raw_input ILIKE '%Spent $15%' ORDER BY created_at DESC LIMIT 1");
        console.log("DATA:", JSON.stringify(res.rows[0], null, 2));
    } catch (e) { console.error(e); }
    process.exit();
}
check();
