import { query } from '../src/db/index.js';

/**
 * Add adaptive scaling fields to plans table
 * - performance_history: JSONB array of weekly results
 * - consecutive_failures: INTEGER count of missed weeks
 * - difficulty_level: FLOAT multiplier (0.5 - 2.0)
 * - weeks_at_current_level: INTEGER for progressive overload tracking
 */
async function addAdaptiveScalingFields() {
    console.log('🔧 Adding adaptive scaling fields to plans table...');

    try {
        // Check if columns already exist
        const checkQuery = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'plans' 
            AND column_name IN ('performance_history', 'consecutive_failures', 'difficulty_level', 'weeks_at_current_level')
        `;

        const existing = await query(checkQuery);
        const existingColumns = existing.rows.map(r => r.column_name);

        if (existingColumns.length === 4) {
            console.log('✅ All adaptive scaling fields already exist');
            return;
        }

        // Add missing columns
        const alterQueries = [];

        if (!existingColumns.includes('performance_history')) {
            alterQueries.push(`
                ALTER TABLE plans 
                ADD COLUMN performance_history JSONB DEFAULT '[]'::jsonb
            `);
        }

        if (!existingColumns.includes('consecutive_failures')) {
            alterQueries.push(`
                ALTER TABLE plans 
                ADD COLUMN consecutive_failures INTEGER DEFAULT 0
            `);
        }

        if (!existingColumns.includes('difficulty_level')) {
            alterQueries.push(`
                ALTER TABLE plans 
                ADD COLUMN difficulty_level FLOAT DEFAULT 1.0
            `);
        }

        if (!existingColumns.includes('weeks_at_current_level')) {
            alterQueries.push(`
                ALTER TABLE plans 
                ADD COLUMN weeks_at_current_level INTEGER DEFAULT 0
            `);
        }

        // Execute all alter queries
        for (const alterQuery of alterQueries) {
            await query(alterQuery);
        }

        console.log('✅ Successfully added adaptive scaling fields');
        console.log(`   - performance_history (JSONB): Tracks weekly results`);
        console.log(`   - consecutive_failures (INT): Counts missed weeks`);
        console.log(`   - difficulty_level (FLOAT): Current difficulty (0.5-2.0)`);
        console.log(`   - weeks_at_current_level (INT): For progressive overload`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

addAdaptiveScalingFields();
