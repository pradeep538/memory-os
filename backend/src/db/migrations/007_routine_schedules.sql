-- Routine Schedules for Notification System
CREATE TABLE routine_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Routine details
    routine_name TEXT NOT NULL,
    routine_type TEXT NOT NULL, -- medication, plant_care, maintenance, custom
    description TEXT,
    
    -- Schedule configuration
    schedule_times TIME[], -- Array of times: ['08:00', '20:00'] for twice daily
    schedule_days INT[], -- Days of week: [1,2,3,4,5,6,7] for every day (1=Monday, 7=Sunday)
    frequency TEXT, -- daily, weekly, custom
    
    -- Notification settings
    notification_enabled BOOLEAN DEFAULT true,
    notification_title TEXT,
    notification_body TEXT,
    
    -- Tracking
    last_notification_sent TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_routine_type CHECK (routine_type IN ('medication', 'plant_care', 'maintenance', 'custom')),
    CONSTRAINT valid_frequency CHECK (frequency IN ('daily', 'weekly', 'custom'))
);

CREATE INDEX idx_routine_schedules_user_id ON routine_schedules(user_id);
CREATE INDEX idx_routine_schedules_enabled ON routine_schedules(notification_enabled) WHERE notification_enabled = true;
