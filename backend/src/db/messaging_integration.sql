-- Messaging Platform Integration Schema
-- For WhatsApp and Telegram bot integration

-- User Integration Mapping
CREATE TABLE IF NOT EXISTS user_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Platform identifiers
    platform VARCHAR(20) NOT NULL,              -- 'whatsapp', 'telegram'
    platform_user_id VARCHAR(100) NOT NULL,     -- Phone number or chat_id
    
    -- Activation
    is_active BOOLEAN DEFAULT false,
    activation_token VARCHAR(50),               -- For secure linking
    activated_at TIMESTAMPTZ,
    
    -- Preferences
    ghost_mode_enabled BOOLEAN DEFAULT true,    -- Silent logging, digest at 9 PM
    reply_mode VARCHAR(20) DEFAULT 'instant',   -- 'instant', 'ghost', 'digest_only'
    digest_time TIME DEFAULT '21:00:00',        -- 9 PM
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_at TIMESTAMPTZ,
    
    UNIQUE(platform, platform_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_integrations_lookup 
    ON user_integrations(platform, platform_user_id);

CREATE INDEX IF NOT EXISTS idx_user_integrations_user 
    ON user_integrations(user_id);

-- Message Log (for digest generation)
CREATE TABLE IF NOT EXISTS platform_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    integration_id UUID REFERENCES user_integrations(id) ON DELETE CASCADE,
    
    -- Message data
    platform VARCHAR(20),
    message_type VARCHAR(20),                   -- 'text', 'voice', 'image'
    content TEXT,
    media_url VARCHAR(500),
    
    -- Processing
    processed BOOLEAN DEFAULT false,
    memory_id UUID REFERENCES memory_units(id),
    
    -- Digest tracking
    included_in_digest_id UUID,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_messages_user 
    ON platform_messages(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_messages_digest 
    ON platform_messages(user_id, created_at DESC) 
    WHERE included_in_digest_id IS NULL;

-- Comments
COMMENT ON TABLE user_integrations IS 'Maps WhatsApp/Telegram users to Memory OS accounts';
COMMENT ON TABLE platform_messages IS 'Stores messages from messaging platforms for digest generation';
