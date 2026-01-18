CREATE TABLE IF NOT EXISTS routine_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    routine_name VARCHAR(255) NOT NULL,
    routine_type VARCHAR(100),
    notification_title VARCHAR(255),
    notification_body TEXT,
    schedule_times TIME[] DEFAULT '{}',
    schedule_days INTEGER[] DEFAULT '{}', -- 1-7 (1=Mon, 7=Sun)
    notification_enabled BOOLEAN DEFAULT true,
    last_notification_sent TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_routines_user ON routine_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_routines_enabled ON routine_schedules(notification_enabled);
