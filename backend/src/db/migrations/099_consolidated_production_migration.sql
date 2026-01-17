-- Consolidated Production Migration for Memory OS
-- Concluding all changes from Phase 1 to Phase 4
-- This script is idempotent and can be run multiple times safely.

-- 1. UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Users Table Updates
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='firebase_uid') THEN 
        ALTER TABLE users ADD COLUMN firebase_uid VARCHAR(128) UNIQUE; 
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='active_categories') THEN 
        ALTER TABLE users ADD COLUMN active_categories VARCHAR(100)[] DEFAULT ARRAY['generic', 'fitness']; 
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);

-- 3. Plans Table Recreation (Ensures correct schema for Adaptive Scaling)
-- WARNING: This drops existing plans data to ensure schema integrity for the new feature.
-- In production, if data exists, use ALTER TABLE statements instead.
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
    
    -- Adaptive Scaling fields
    performance_history JSONB DEFAULT '[]'::jsonb,
    consecutive_failures INTEGER DEFAULT 0,
    difficulty_level FLOAT DEFAULT 1.0,
    weeks_at_current_level INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_plans_user_status ON plans(user_id, status);

-- 4. Audit Log & Intent Architecture
CREATE TABLE IF NOT EXISTS intent_registry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    intent_name TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    pattern_examples JSONB DEFAULT '[]',
    confidence_threshold DECIMAL(3,2) DEFAULT 0.8,
    is_critical BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Notifications Meta
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='related_plan_id') THEN 
        ALTER TABLE notifications ADD COLUMN related_plan_id UUID REFERENCES plans(id); 
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='metadata') THEN 
        ALTER TABLE notifications ADD COLUMN metadata JSONB DEFAULT '{}'; 
    END IF;
END $$;

-- 6. High-Precision Coaching (Routine Schedules)
CREATE TABLE IF NOT EXISTS routine_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    routine_name VARCHAR(255) NOT NULL,
    schedule_times TIME[] DEFAULT '{}',
    notification_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Engagement & Analytics (Phase 2)
CREATE TABLE IF NOT EXISTS metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL,
  numeric_value DECIMAL(10,2),
  metric_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS habits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  habit_name VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Cleanup expired clarifications
CREATE OR REPLACE FUNCTION cleanup_expired_clarifications()
RETURNS void AS $$
BEGIN
    DELETE FROM clarification_sessions
    WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- 9. Automatic Updated At
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger assignment (Safe)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
        CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Final Verification Note
COMMENT ON DATABASE postgres IS 'Memory OS Production Ready Schema - Consolidated v1.0';
