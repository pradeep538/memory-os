
import { query } from '../src/db/index.js';

async function seed() {
    try {
        console.log('🌱 Starting Comprehensive Seed...');

        // 1. Clean existing data (Optional: Uncomment to wipe)
        // await query('TRUNCATE TABLE memory_units, habits, patterns, users CASCADE'); 

        // 2. Ensure Test User Exists
        const userId = 'c3d50e53-701f-4fc7-bd57-e84e0663fb3a'; // Matched with auth.js demo
        await query(`
            INSERT INTO users (id, username, email, subscription_tier)
            VALUES ($1, 'demo_user', 'demo@memoryos.app', 'pro')
            ON CONFLICT (id) DO UPDATE SET subscription_tier = 'pro';
        `, [userId]);
        console.log('✅ User seeded');

        // 3. Seed Habits (Various types)
        await query(`
            INSERT INTO habits (user_id, habit_name, habit_type, target_frequency, target_frequency_unit, status, completion_rate)
            VALUES 
                ($1, 'Morning Run', 'build', 1, 'day', 'active', 85.5),
                ($1, 'Read Book', 'build', 3, 'weekly', 'active', 60.0),
                ($1, 'No Sugar', 'quit', 1, 'day', 'paused', null)
            ON CONFLICT DO NOTHING;
        `, [userId]);
        console.log('✅ Habits seeded');

        // 4. Seed Patterns
        await query(`
            INSERT INTO patterns (user_id, pattern_type, description, confidence_score)
            VALUES 
                ($1, 'frequency', 'User runs every Monday morning', 0.95),
                ($1, 'correlation', 'Sleep affects productivity', 0.88)
            ON CONFLICT DO NOTHING;
        `, [userId]);
        console.log('✅ Patterns seeded');

        // 5. Seed Feature Flags (Reset to defaults)
        await query(`
            INSERT INTO feature_flags (feature_key, is_enabled, visibility_type)
            VALUES ('widget_habits', true, 'until_interaction')
            ON CONFLICT (feature_key) DO UPDATE SET 
                is_enabled = true,
                visibility_type = 'until_interaction';
        `);
        console.log('✅ Feature Flags validated');

        console.log('🎉 Seed Complete! Ready for Manual Verify.');
        process.exit(0);
    } catch (e) {
        console.error('❌ Seed Failed:', e);
        process.exit(1);
    }
}

seed();
