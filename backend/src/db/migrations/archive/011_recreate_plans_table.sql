-- Recreate plans table with correct schema for Action Plans feature
-- Includes adaptive scaling fields for science-based coaching
DROP TABLE IF EXISTS plans CASCADE;

CREATE TABLE plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    plan_name VARCHAR(255) NOT NULL,
    plan_data JSONB NOT NULL DEFAULT '{}',
    duration_weeks INTEGER NOT NULL DEFAULT 4,
    current_week INTEGER NOT NULL DEFAULT 1,
    progress INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    
    -- Adaptive Scaling fields (Science-based coaching)
    performance_history JSONB DEFAULT '[]'::jsonb,
    consecutive_failures INTEGER DEFAULT 0,
    difficulty_level FLOAT DEFAULT 1.0,
    weeks_at_current_level INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_plans_user_status ON plans(user_id, status);
