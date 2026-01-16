
import { query } from '../src/db/index.js';

async function migrate() {
    try {
        console.log('🔄 Migrating Engagement Tables...');

        // 1. user_feedback
        await query(`
            CREATE TABLE IF NOT EXISTS user_feedback (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                message TEXT NOT NULL,
                context TEXT NOT NULL,
                is_read BOOLEAN DEFAULT false,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);
        console.log('✅ Created table: user_feedback');

        // 2. feed_items
        await query(`
            CREATE TABLE IF NOT EXISTS feed_items (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                body TEXT NOT NULL,
                data JSONB DEFAULT '{}',
                is_read BOOLEAN DEFAULT false,
                expires_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);
        console.log('✅ Created table: feed_items');

        // 3. identity_progress
        await query(`
            CREATE TABLE IF NOT EXISTS identity_progress (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                label TEXT NOT NULL,
                reason TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);
        console.log('✅ Created table: identity_progress');

        console.log('🎉 Migration Complete!');
        process.exit(0);

    } catch (e) {
        console.error('❌ Migration Failed:', e);
        process.exit(1);
    }
}

migrate();
