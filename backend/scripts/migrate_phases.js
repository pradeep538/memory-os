import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../src/db/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
    console.log('Starting Phases Column Migration...');

    try {
        const sqlPath = path.join(__dirname, '../src/db/migrations/015_add_phases_to_plans.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log(`Executing SQL from ${sqlPath}...`);
        await db.query(sql);

        console.log('✅ Migration successful: phases column added to plans table.');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        process.exit();
    }
}

migrate();
