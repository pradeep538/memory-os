import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL
});

async function resetPgBoss() {
    try {
        console.log('🗑️  Dropping pgboss schema to force regeneration...');
        await pool.query('DROP SCHEMA IF EXISTS pgboss CASCADE;');
        console.log('✅ pgboss schema dropped. The application will recreate it on startup.');
    } catch (err) {
        console.error('❌ Error dropping schema:', err);
    } finally {
        await pool.end();
    }
}

resetPgBoss();
