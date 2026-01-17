
import db from '../src/db/index.js';

const createFcmTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS user_fcm_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        device_info JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    `;

    try {
        await db.query(query);
        console.log('✅ "user_fcm_tokens" table created successfully.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to create "user_fcm_tokens" table:', error);
        process.exit(1);
    }
};

createFcmTable();
