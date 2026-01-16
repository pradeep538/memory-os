import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function seedUserData() {
    const client = await pool.connect();
    try {
        console.log('🌱 Seeding data for the latest user...');

        // 1. Find the latest user
        const userResult = await client.query(`
      SELECT * FROM users 
      ORDER BY created_at DESC 
      LIMIT 1
    `);

        if (userResult.rows.length === 0) {
            console.error('❌ No users found. Sign in via the app first.');
            return;
        }

        const user = userResult.rows[0];
        console.log(`👤 Found user: ${user.email} (ID: ${user.id})`);

        // 2. Create Memories
        const memories = [
            { text: 'Morning run 5km in 25 mins', category: 'fitness', type: 'activity', confidence: 0.95 },
            { text: 'Spent $50 on groceries at Whole Foods', category: 'finance', type: 'transaction', confidence: 0.98 },
            { text: 'Read "Atomic Habits" for 30 mins', category: 'generic', type: 'activity', confidence: 0.90 },
            { text: 'Meditated for 10 minutes using Headspace', category: 'mindfulness', type: 'activity', confidence: 0.92 },
            { text: 'Drank 2 liters of water today', category: 'health', type: 'activity', confidence: 0.88 },
            { text: 'Meeting with the team about Q4 goals', category: 'generic', type: 'event', confidence: 0.85 },
            { text: 'Bought new running shoes $120', category: 'finance', type: 'transaction', confidence: 0.99 },
            { text: 'Yoga session evening stretch', category: 'fitness', type: 'activity', confidence: 0.94 },
            { text: 'Took vitamins', category: 'health', type: 'activity', confidence: 0.90 },
            { text: 'Saved $500 for vacation', category: 'finance', type: 'transaction', confidence: 0.96 }
        ];

        console.log('📝 Creating memories...');
        for (const m of memories) {
            await client.query(`
        INSERT INTO memory_units (
          user_id, raw_input, category, event_type, confidence_score, status, source, normalized_data
        ) VALUES ($1, $2, $3, $4, $5, 'validated', 'seed_script', '{}')
      `, [user.id, m.text, m.category, m.type, m.confidence]);
        }

        // 3. Create Habits
        console.log('📅 Creating habits...');
        await client.query(`
      INSERT INTO habits (
        user_id, habit_name, habit_type, category, target_frequency, target_frequency_unit, status
      ) VALUES 
      ($1, 'Morning Meditation', 'build', 'mindfulness', 7, 'weekly', 'active'),
      ($1, 'Read 30 mins', 'build', 'generic', 5, 'weekly', 'active')
    `, [user.id]);

        // 4. Update Engagement
        console.log('📈 Updating engagement...');
        await client.query(`
      INSERT INTO user_engagement (
        user_id, engagement_score, current_logging_streak, total_events, events_last_30_days
      ) VALUES ($1, 75, 5, 42, 38)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        engagement_score = 75,
        current_logging_streak = 5,
        total_events = user_engagement.total_events + 10,
        events_last_30_days = user_engagement.events_last_30_days + 10
    `, [user.id]);

        console.log('✅ Seed complete! Refresh your app.');

    } catch (err) {
        console.error('❌ Seeding failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

seedUserData();
