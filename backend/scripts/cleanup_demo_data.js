import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function cleanupDemoData() {
    const client = await pool.connect();
    try {
        console.log('🧹 Cleaning up demo data...');

        // Delete data for demo user 0000...
        await client.query(`
      DELETE FROM habits WHERE user_id = '00000000-0000-0000-0000-000000000000';
      DELETE FROM memory_units WHERE user_id = '00000000-0000-0000-0000-000000000000';
    `);

        console.log('✅ Demo data cleanup complete.');
    } catch (err) {
        console.error('❌ Cleanup failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

cleanupDemoData();
