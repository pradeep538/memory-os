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

const migration = `
-- Migration: Add firebase_uid to users table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='firebase_uid') THEN 
        ALTER TABLE users ADD COLUMN firebase_uid VARCHAR(128) UNIQUE; 
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
`;

async function runMigration() {
    const client = await pool.connect();
    try {
        console.log('🚀 Running migration...');
        await client.query(migration);
        console.log('✅ Migration successful: Added firebase_uid to users table');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
