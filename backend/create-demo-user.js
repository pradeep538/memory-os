// Find and fix demo user
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function fixDemoUser() {
    try {
        // Check what users exist
        console.log('Checking existing users...\n');
        const existing = await pool.query('SELECT id, username, email FROM users LIMIT 5');
        console.log('Existing users:', existing.rows);
        console.log('');

        // Delete any conflicting demo users and recreate
        console.log('Cleaning up and creating demo user...\n');

        await pool.query(`DELETE FROM users WHERE username = 'demo_user' OR email = 'demo@memoryos.app'`);

        const result = await pool.query(`
      INSERT INTO users (id, username, email, subscription_tier, active_categories) 
      VALUES (
        '00000000-0000-0000-0000-000000000000', 
        'demo_user', 
        'demo@memoryos.app', 
        'free',
        ARRAY['generic', 'fitness', 'finance', 'routine', 'mindfulness', 'health']
      )
      RETURNING *
    `);

        console.log('✅ Demo user created:\n');
        console.log('  ID:', result.rows[0].id);
        console.log('  Username:', result.rows[0].username);
        console.log('  Email:', result.rows[0].email);
        console.log('  Tier:', result.rows[0].subscription_tier);
        console.log('  Categories:', result.rows[0].active_categories);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

fixDemoUser();
