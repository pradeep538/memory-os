import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Using DATABASE_URL logic similar to other scripts or just raw connectionString
const connectionConfig = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'memory_os',
        password: process.env.DB_PASSWORD || 'postgres',
        port: parseInt(process.env.DB_PORT || '5432'),
    };

const pool = new pg.Pool(connectionConfig);

async function runMigration() {
    try {
        console.log('🔌 Connecting to database...');
        const client = await pool.connect();

        try {
            console.log('📜 Reading migration file...');
            const migrationPath = path.join(__dirname, '../src/db/migrations/012_create_routine_schedules.sql');
            const sql = fs.readFileSync(migrationPath, 'utf8');

            console.log('🚀 Executing migration...');
            await client.query(sql);

            console.log('✅ Routine Schedules table created successfully!');
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await pool.end();
    }
}

runMigration();
