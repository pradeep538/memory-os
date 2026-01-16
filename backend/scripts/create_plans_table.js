
import db from '../src/db/index.js';

const createPlansTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category VARCHAR(50) NOT NULL,
        plan_name VARCHAR(255) NOT NULL,
        plan_data JSONB NOT NULL DEFAULT '{}',
        duration_weeks INTEGER NOT NULL DEFAULT 4,
        current_week INTEGER NOT NULL DEFAULT 1,
        progress INTEGER NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    `;

    try {
        await db.query(query);
        console.log('✅ "plans" table created successfully.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to create "plans" table:', error);
        process.exit(1);
    }
};

createPlansTable();
