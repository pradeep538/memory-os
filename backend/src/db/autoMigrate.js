import db from './index.js';

export async function runAutoMigrations() {
    console.log('🛡️  Running auto-migrations...');

    try {
        // Migration 015: Add 'phases' column to plans table
        // We check existence manually or just use IF NOT EXISTS if PG version supports it (PG 9.6+ supports IF NOT EXISTS on ADD COLUMN)
        // memory-os runs on PG 15+, so it is safe.

        await db.query(`
            ALTER TABLE plans 
            ADD COLUMN IF NOT EXISTS phases JSONB DEFAULT '[]'::jsonb;
        `);

        // Ensure schedules in existing plans are migrated if phases is empty (Optional for now)
        // We just needed the column to exist to prevent errors.

        console.log('✅ Auto-migrations completed: Schema is up to date.');
    } catch (error) {
        console.error('❌ Auto-migration failed:', error.message);
        // Don't kill process, maybe transient DB issue
    }
}
