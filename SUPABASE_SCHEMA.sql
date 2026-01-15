-- Memory OS Database Schema
-- Version: 1.0
-- PostgreSQL 15+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE,
    email VARCHAR(255) UNIQUE,
    subscription_tier VARCHAR(20) DEFAULT 'free',
    subscription_expires_at TIMESTAMPTZ,
    active_categories VARCHAR(100)[] DEFAULT ARRAY['generic', 'fitness'],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Memory Units (Immutable Event Log)
CREATE TABLE memory_units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Input
    raw_input TEXT NOT NULL,
    source VARCHAR(50) DEFAULT 'text', -- text, voice, api, session
    
    -- Understanding
    event_type VARCHAR(100), -- activity, transaction, event, health, routine
    category VARCHAR(100), -- fitness, finance, mindfulness, routine, health, generic
    normalized_data JSONB NOT NULL,
    
    -- Confidence & Status
    confidence_score DECIMAL(3,2) CHECK (confidence_score BETWEEN 0 AND 1),
    status VARCHAR(20) DEFAULT 'tentative',
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Correction tracking
    corrected_by UUID REFERENCES memory_units(id),
    is_correction BOOLEAN DEFAULT false,
    
    CONSTRAINT valid_status CHECK (status IN ('tentative', 'validated', 'corrected'))
);

CREATE INDEX idx_memory_user_time ON memory_units(user_id, created_at DESC);
CREATE INDEX idx_memory_category ON memory_units(category, created_at DESC);
CREATE INDEX idx_memory_event_type ON memory_units(event_type);

-- 3. Entities (Extracted from memories)
CREATE TABLE entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    entity_type VARCHAR(100), -- person, place, activity, item, concept
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    
    properties JSONB DEFAULT '{}',
    confidence_score DECIMAL(3,2),
    
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    mention_count INT DEFAULT 1,
    
    UNIQUE(user_id, entity_type, name)
);

CREATE INDEX idx_entities_user_type ON entities(user_id, entity_type);

-- 4. Patterns (Detected behaviors)
CREATE TABLE patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(100),
    
    pattern_type VARCHAR(100), -- frequency, correlation, trend, anomaly
    description TEXT NOT NULL,
    
    -- Evidence
    supporting_memories UUID[],
    confidence_score DECIMAL(3,2),
    
    -- Metadata
    first_detected_at TIMESTAMPTZ DEFAULT NOW(),
    last_validated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Lifecycle
    is_actionable BOOLEAN DEFAULT false,
    generated_plan_id UUID,
    status VARCHAR(20) DEFAULT 'active', -- active, dismissed, automated
    
    CONSTRAINT valid_pattern_status CHECK (status IN ('active', 'dismissed', 'automated'))
);

CREATE INDEX idx_patterns_user_category ON patterns(user_id, category);

-- 5. Plans (Intelligent recommendations)
CREATE TABLE plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(100),
    
    plan_type VARCHAR(100), -- gym, yoga, budget, routine
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Plan data
    template_name VARCHAR(100),
    plan_data JSONB NOT NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'suggested',
    
    -- Tracking
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Source
    generated_from_pattern UUID REFERENCES patterns(id),
    
    CONSTRAINT valid_plan_status CHECK (status IN ('suggested', 'active', 'completed', 'abandoned'))
);

CREATE INDEX idx_plans_user_status ON plans(user_id, status);

-- 6. Sessions (Guided sessions)
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(100),
    
    session_type VARCHAR(100), -- meditation, mantra, yoga, breathing
    config JSONB DEFAULT '{}',
    progress JSONB DEFAULT '{}',
    feedback JSONB DEFAULT '{}',
    
    status VARCHAR(20) DEFAULT 'active',
    
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    memory_id UUID REFERENCES memory_units(id),
    
    CONSTRAINT valid_session_status CHECK (status IN ('active', 'completed', 'abandoned'))
);

CREATE INDEX idx_sessions_user_type ON sessions(user_id, session_type);

-- 7. Notifications (Scheduled reminders)
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    notification_type VARCHAR(100), -- reminder, insight, alert, summary
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    
    -- Scheduling
    scheduled_for TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending',
    
    -- Context
    related_memory_id UUID REFERENCES memory_units(id),
    related_plan_id UUID REFERENCES plans(id),
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_notification_status CHECK (status IN ('pending', 'sent', 'failed', 'cancelled'))
);

CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_for) 
    WHERE status = 'pending';

-- 8. Usage Tracking (For freemium limits)
CREATE TABLE usage_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    metric VARCHAR(50) NOT NULL, -- voice_inputs, guided_sessions, insights, etc.
    count INT DEFAULT 0,
    
    period VARCHAR(20) NOT NULL, -- daily, monthly
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    UNIQUE(user_id, metric, period, period_start)
);

CREATE INDEX idx_usage_user_period ON usage_tracking(user_id, period, period_start);

-- Functions for automatic timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default test user
INSERT INTO users (id, username, email, subscription_tier) 
VALUES ('00000000-0000-0000-0000-000000000000', 'demo_user', 'demo@memoryos.app', 'free')
ON CONFLICT DO NOTHING;
