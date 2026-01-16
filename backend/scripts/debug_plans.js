
import db from '../src/db/index.js';

const verifyPlans = async () => {
    console.log('🔍 Verifying "plans" table...');

    // 1. Check if table exists
    try {
        const res = await db.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'plans'
            );
        `);
        console.log('Table exists:', res.rows[0].exists);
    } catch (e) {
        console.error('❌ Failed to check table existence:', e.message);
    }

    // 2. Try Dummy Insert
    console.log('📝 Attempting dummy insert...');
    try {
        // Use a random UUID for user_id to force FK error, OR assume first user
        // Let's first get a valid user
        const userRes = await db.query('SELECT id FROM users LIMIT 1');
        if (userRes.rows.length === 0) {
            console.log('⚠️ No users found. Cannot test Insert.');
            return;
        }
        const userId = userRes.rows[0].id;
        console.log('Found User ID:', userId);

        const query = `
            INSERT INTO plans (
                user_id, category, plan_name, plan_data, duration_weeks, status
            ) VALUES ($1, 'test', 'Debug Plan', '{}', 4, 'active')
            RETURNING id;
        `;
        const insertRes = await db.query(query, [userId]);
        console.log('✅ INSERT SUCCEEDED! Plan ID:', insertRes.rows[0].id);

        // Cleanup
        await db.query('DELETE FROM plans WHERE id = $1', [insertRes.rows[0].id]);
        console.log('🧹 Cleanup successful.');

    } catch (error) {
        console.error('❌ INSERT FAILED with error:');
        console.error('Message:', error.message);
        console.error('Code:', error.code);
        console.error('Detail:', error.detail);
        if (error.code === '42883') console.log('💡 Hint: Missing function (e.g. gen_random_uuid?)');
        if (error.code === '42P01') console.log('💡 Hint: Table undefined');
        if (error.code === '23503') console.log('💡 Hint: Foreign Key violation');
    }
    process.exit(0);
};

verifyPlans();
