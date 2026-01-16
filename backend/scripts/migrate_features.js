
import { query } from '../src/db/index.js';

async function migrate() {
    try {
        console.log('🚀 Starting Feature Flags Migration...');

        // 1. Create Table
        await query(`
            CREATE TABLE IF NOT EXISTS feature_flags (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                feature_key VARCHAR(50) NOT NULL UNIQUE,
                is_enabled BOOLEAN DEFAULT true,
                visibility_type VARCHAR(50) DEFAULT 'always', 
                param_duration_days INT,
                description TEXT,
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('✅ Created feature_flags table');

        // 2. Seed Default Data (Habit Widget)
        // We use ON CONFLICT to avoid errors on re-run
        await query(`
            INSERT INTO feature_flags (feature_key, is_enabled, visibility_type, description)
            VALUES ('widget_habits', true, 'until_interaction', 'Habit Widget visible until user interacts')
            ON CONFLICT (feature_key) DO NOTHING;
        `);
        console.log('✅ Seeded feature: widget_habits');

        console.log('🎉 Migration Complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration Failed:', error);
        process.exit(1);
    }
}

migrate();
