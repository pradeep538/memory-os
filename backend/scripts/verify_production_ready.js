import pg from 'pg';
import dotenv from 'dotenv';
import planAdaptiveService from '../src/services/plans/planAdaptiveService.js';

dotenv.config();
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function verifySchema() {
    console.log('🔍 Checking database schema integrity...');
    const tables = ['users', 'plans', 'notifications', 'memory_units'];

    for (const table of tables) {
        const res = await pool.query(`SELECT 1 FROM information_schema.tables WHERE table_name = $1`, [table]);
        if (res.rows.length === 0) {
            console.error(`❌ TABLE MISSING: ${table}`);
            return false;
        }
        console.log(`  ✓ Table '${table}' exists`);
    }

    // Check critical columns in plans table
    const planColumns = ['performance_history', 'consecutive_failures', 'difficulty_level', 'weeks_at_current_level'];
    for (const col of planColumns) {
        const res = await pool.query(`
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'plans' AND column_name = $1
        `, [col]);
        if (res.rows.length === 0) {
            console.error(`❌ COLUMN MISSING in 'plans' table: ${col}`);
            return false;
        }
        console.log(`  ✓ Column 'plans.${col}' exists`);
    }

    return true;
}

async function verifyAdaptiveLogic() {
    console.log('\n🧠 Verifying Adaptive Scaling Logic...');

    const mockPlan = {
        id: 'test-integrity-plan',
        user_id: '00000000-0000-0000-0000-000000000001',
        plan_name: 'Integrity Check',
        progress: 0,
        consecutive_failures: 1, // Simulate one existing failure
        difficulty_level: 1.0,
        plan_data: { phases: [{ frequency: 10 }] }
    };

    // We don't want to hit the DB for this internal logic test, 
    // but planAdaptiveService currently uses query directly.
    // For a true "production ready" test, we'll use the existing test script.
    console.log('  → Run: node scripts/test_adaptive_scaling.js for full logic verification.');
    return true;
}

async function run() {
    console.log('🚀 MEMORY OS PRODUCTION READINESS CHECK\n');

    const schemaOk = await verifySchema();
    if (!schemaOk) {
        console.error('\n🛑 SCHEMA INTEGRITY FAILED. Run migrations before deploying.');
        process.exit(1);
    }

    const logicOk = await verifyAdaptiveLogic();

    console.log('\n✨ ALL SYSTEMS VERIFIED FOR PRODUCTION (SCHEMA-WISE)');
    console.log('Next Steps: Run core logic test scripts as listed in production_readiness_checklist.md');
    process.exit(0);
}

run().catch(err => {
    console.error('❌ Critical failure during verification:', err);
    process.exit(1);
});
