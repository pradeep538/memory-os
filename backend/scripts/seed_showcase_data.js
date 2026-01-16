
import { query } from '../src/db/index.js';

async function seedShowcase() {
    try {
        console.log('🚀 Starting Showcase Seed...');

        // 1. Get/Create Demo User
        // 1. Get/Create User by Firebase UID
        const firebaseUid = 'ubT6IdK9AZf8goNJWbI8cqChmS82'; // User's Firebase UID
        let internalUserId;

        // Try to find existing user
        const userRes = await query('SELECT id FROM users WHERE firebase_uid = $1', [firebaseUid]);

        if (userRes.rows.length > 0) {
            internalUserId = userRes.rows[0].id;
            console.log(`✅ Found existing user with Internal ID: ${internalUserId}`);
        } else {
            console.log('✨ Creating new user...');
            const newUser = await query(`
                INSERT INTO users (firebase_uid, username, email, subscription_tier)
                VALUES ($1, 'demo_user', 'demo@memoryos.app', 'pro')
                RETURNING id;
            `, [firebaseUid]);
            internalUserId = newUser.rows[0].id;
            console.log(`✅ Created user with Internal ID: ${internalUserId}`);
        }

        const userId = internalUserId; // Use this UUID for all foreign keys
        console.log('✅ User verified');

        // 2. Clear previous data for a clean slate
        console.log('🧹 Cleaning old demo data...');
        await query('DELETE FROM habits WHERE user_id = $1', [userId]);
        await query('DELETE FROM patterns WHERE user_id = $1', [userId]);
        await query('DELETE FROM notifications WHERE user_id = $1', [userId]);
        // Note: cascading delete on memory_units will clean entities
        await query('DELETE FROM memory_units WHERE user_id = $1', [userId]);

        // 3. Seed Habits (Rich & Active)
        console.log('🌱 Seeding Habits...');
        await query(`
            INSERT INTO habits (user_id, habit_name, habit_type, target_frequency, target_frequency_unit, status, completion_rate, current_streak)
            VALUES 
                ($1, 'Morning Meditation', 'build', 1, 'day', 'active', 0.9, 12),
                ($1, 'Read 30 mins', 'build', 1, 'day', 'active', 0.8, 5),
                ($1, 'Gym Workout', 'build', 3, 'week', 'active', 0.75, 2),
                ($1, 'No Caffeine after 2 PM', 'quit', 1, 'day', 'active', 1.0, 20),
                ($1, 'Journaling', 'build', 1, 'day', 'active', 0.5, 0)
        `, [userId]);

        // 4. Seed Patterns (Insights)
        console.log('🧠 Seeding Patterns...');
        await query(`
            INSERT INTO patterns (user_id, pattern_type, description, confidence_score, category, first_detected_at, last_validated_at)
            VALUES 
                ($1, 'frequency', 'You are most productive between 9 AM and 11 AM.', 0.92, 'productivity', NOW(), NOW()),
                ($1, 'correlation', 'Your mood improves 30% on days you run.', 0.85, 'health', NOW() - INTERVAL '2 hours', NOW()),
                ($1, 'trend', 'Spending on "Eating Out" has decreased by 15% this month.', 0.78, 'finance', NOW() - INTERVAL '2 days', NOW())
        `, [userId]);

        // 5. Seed Memories & Entities (The Core Content)
        console.log('📝 Seeding Memories & Entities...');

        // Helper to insert memory and link entity
        const insertMemory = async (input, category, offsetHours, entities = []) => {
            // Create Memory
            const res = await query(`
                INSERT INTO memory_units (user_id, raw_input, category, status, source, created_at, normalized_data)
                VALUES ($1, $2, $3, 'validated', 'voice', NOW() - INTERVAL '${offsetHours} hours', '{}')
                RETURNING id;
            `, [userId, input, category]);

            const memoryId = res.rows[0].id;

            // Create Entities
            for (const ent of entities) {
                // Check if entity exists for user to avoid duplicates or just insert new
                // For seeding simple showcase, we'll just insert
                await query(`
                    INSERT INTO entities (user_id, entity_type, name, first_seen_at, last_seen_at, mention_count, confidence_score)
                    VALUES ($1, $2, $3, NOW(), NOW(), 1, 1.0)
                    ON CONFLICT (user_id, entity_type, name) 
                    DO UPDATE SET mention_count = entities.mention_count + 1, last_seen_at = NOW();
                `, [userId, ent.type, ent.name]);
            }
        };

        // Recent (Today)
        await insertMemory('Had a great meeting with Alex about the roadmap.', 'work', 1, [{ type: 'person', name: 'Alex' }, { type: 'topic', name: 'Roadmap' }]);
        await insertMemory('Paid $45 for lunch at Sushi Place.', 'finance', 3, [{ type: 'place', name: 'Sushi Place' }]);
        await insertMemory('Feeling really energetic after the run.', 'health', 4, []);

        // Yesterday
        await insertMemory('Finished reading "Atomic Habits". highly recommend.', 'personal', 26, [{ type: 'topic', name: 'Atomic Habits' }]);

        // Earlier this week (for category stats)
        await insertMemory('Gym session: legs and core.', 'fitness', 48, []);
        await insertMemory('Grocery shopping: $120.', 'finance', 52, []);
        await insertMemory('Meditated for 20 minutes.', 'mindfulness', 74, []);
        await insertMemory('Discussed Project X with Sarah.', 'work', 96, [{ type: 'person', name: 'Sarah' }, { type: 'topic', name: 'Project X' }]);

        // 6. See Notifications (Gap Warnings)
        console.log('🔔 Seeding Notifications...');
        await query(`
            INSERT INTO notifications (user_id, title, body, notification_type, status, created_at, scheduled_for, sent_at)
            VALUES 
                ($1, 'Gap Detected', 'You haven''t logged any water intake today.', 'alert', 'sent', NOW(), NOW(), NOW()),
                ($1, 'Achievement Unlocked', '7 Day Streak in Mindfulness!', 'achievement', 'sent', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day')
        `, [userId]);

        console.log('✨ Showcase Data Seeded Successfully!');
        process.exit(0);

    } catch (e) {
        console.error('❌ Showcase Seed Failed:', e);
        process.exit(1);
    }
}

seedShowcase();
