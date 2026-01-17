import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../src/db/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
    console.log('Starting Blueprint Sessions Migration...');

    try {
        const sqlPath = path.join(__dirname, '../src/db/migrations/014_blueprint_sessions.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log(`Executing SQL from ${sqlPath}...`);
        await db.query(sql);

        console.log('✅ Migration successful: blueprint_sessions table created.');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        process.exit();
    }
}

migrate();
