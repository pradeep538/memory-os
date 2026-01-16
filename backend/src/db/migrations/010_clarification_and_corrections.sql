-- Clarification Sessions
-- Stores pending clarifications for ambiguous inputs

CREATE TABLE IF NOT EXISTS clarification_sessions (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    original_input TEXT NOT NULL,
    candidates JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    resolved BOOLEAN DEFAULT false
);

CREATE INDEX idx_clarification_sessions_user ON clarification_sessions(user_id);
CREATE INDEX idx_clarification_sessions_expires ON clarification_sessions(expires_at) 
  WHERE resolved = false;

-- User Intent Patterns
-- Learns user preferences for ambiguous inputs

CREATE TABLE IF NOT EXISTS user_intent_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    input_pattern TEXT NOT NULL,
    preferred_intent TEXT NOT NULL,
    frequency INT DEFAULT 1,
    learned_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    
    UNIQUE(user_id, input_pattern)
);

CREATE INDEX idx_user_intent_patterns_user ON user_intent_patterns(user_id);
CREATE INDEX idx_user_intent_patterns_pattern ON user_intent_patterns(input_pattern);

-- Add edit tracking to memory_units
ALTER TABLE memory_units
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS edit_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_reason TEXT;

CREATE INDEX idx_memory_units_edited ON memory_units(edited_at) WHERE edited_at IS NOT NULL;
CREATE INDEX idx_memory_units_deleted ON memory_units(deleted_at) WHERE deleted_at IS NOT NULL;

-- Cleanup expired clarification sessions (cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_clarifications()
RETURNS void AS $$
BEGIN
    DELETE FROM clarification_sessions
    WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE clarification_sessions IS 'Stores temporary clarification sessions for ambiguous user inputs';
COMMENT ON TABLE user_intent_patterns IS 'Learns user preferences to reduce future clarification needs';
