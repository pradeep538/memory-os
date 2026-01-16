
import pkg from 'pg';
const { Pool } = pkg;
// Directly use connection string or load from .env if needed
// Assuming .env is loaded or process.env has it. 
// For standalone script, better to load dotenv
import dotenv from 'dotenv';
dotenv.config({ path: '/Users/geetag/Documents/memory-os/backend/.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function fixConstraint() {
    try {
        console.log('🔧 Fixing memory_units check constraint...');

        // 1. Drop existing constraint
        await pool.query(`ALTER TABLE memory_units DROP CONSTRAINT IF EXISTS valid_status`);

        // 2. Add updated constraint
        await pool.query(`
            ALTER TABLE memory_units 
            ADD CONSTRAINT valid_status 
            CHECK (status IN ('tentative', 'validated', 'processing', 'transcribed', 'failed_enhancement', 'discarded', 'failed_permanently'))
        `);

        console.log('✅ Constraint updated successfully!');

    } catch (err) {
        console.error('❌ Error updating constraint:', err);
    } finally {
        await pool.end();
    }
}

fixConstraint();
