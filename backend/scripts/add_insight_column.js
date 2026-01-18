import db from '../src/db/index.js';

async function migrate() {
    try {
        console.log('🔄 Adding insight column to patterns table...');
        await db.query('ALTER TABLE patterns ADD COLUMN IF NOT EXISTS insight TEXT;');
        console.log('✅ Migration successful!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

migrate();
