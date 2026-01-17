-- Blueprint Creation Sessions (The Architect Mode)
CREATE TABLE IF NOT EXISTS blueprint_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'active', -- active, completed, abandoned
    current_draft JSONB DEFAULT '{}',      -- The evolving blueprint JSON
    conversation_history JSONB DEFAULT '[]', -- List of {role: 'user'|'assistant', text: '...'}
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_interaction_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_blueprint_sessions_user ON blueprint_sessions(user_id);
CREATE INDEX idx_blueprint_sessions_active ON blueprint_sessions(user_id) WHERE status = 'active';
