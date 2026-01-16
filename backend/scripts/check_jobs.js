
import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
    console.log(`Checking pgboss.job table...`);

    try {
        const res = await pool.query(`
            SELECT state, count(*) 
            FROM pgboss.job 
            WHERE name = 'process-memory' 
            GROUP BY state
        `);

        console.table(res.rows);

        const latest = await pool.query(`
            SELECT id, state, created_on, output 
            FROM pgboss.job 
            WHERE name = 'process-memory' 
            ORDER BY created_on DESC 
            LIMIT 1
        `);
        console.log("\nLatest Job Error Detail:");
        // Pretty print the JSON output which contains the error stack
        if (latest.rows.length > 0) {
            console.log(JSON.stringify(latest.rows[0], null, 2));
        } else {
            console.log("No jobs found.");
        }

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

check();
