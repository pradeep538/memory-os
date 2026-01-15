-- Memory OS - Phase 2 Intelligence Schema
-- Structured Metrics, Habits, and Engagement Tracking

-- ============================================
-- 1. METRICS TABLE (Quantifiable Data)
-- ============================================

CREATE TABLE metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  memory_id UUID REFERENCES memory_units(id) ON DELETE CASCADE,
  
  -- Classification
  category VARCHAR(50) NOT NULL,
  metric_type VARCHAR(50) NOT NULL,  -- 'workout', 'expense', 'habit_completion', etc.
  
  -- Quantifiable fields
  numeric_value DECIMAL(10,2),
  unit VARCHAR(20),                   -- 'minutes', 'INR', 'count', 'kg', etc.
  duration_minutes INT,
  frequency_count INT DEFAULT 1,
  
  -- Time-series data
  metric_date DATE NOT NULL,
  metric_time TIME,
  
  -- Metadata
  tags VARCHAR(50)[],
  additional_data JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for fast queries
  CONSTRAINT valid_numeric_value CHECK (numeric_value >= 0)
);

CREATE INDEX idx_metrics_user_date ON metrics(user_id, metric_date DESC);
CREATE INDEX idx_metrics_category ON metrics(category, metric_date DESC);
CREATE INDEX idx_metrics_type ON metrics(metric_type, metric_date DESC);
CREATE INDEX idx_metrics_user_category ON metrics(user_id, category, metric_date DESC);

COMMENT ON TABLE metrics IS 'Structured, quantifiable metrics extracted from memory units';
COMMENT ON COLUMN metrics.numeric_value IS 'Primary numeric measurement (amount, duration, count)';
COMMENT ON COLUMN metrics.tags IS 'Array of tags for filtering (e.g., [chest, strength, morning])';

-- ============================================
-- 2. HABITS TABLE (Build & Quit)
-- ============================================

CREATE TABLE habits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Habit details
  habit_name VARCHAR(255) NOT NULL,
  habit_type VARCHAR(20) NOT NULL,      -- 'build' or 'quit'
  category VARCHAR(50),
  description TEXT,
  
  -- Goal definition
  target_frequency INT,                  -- e.g., 5 times per week
  target_frequency_unit VARCHAR(20),     -- 'daily', 'weekly', 'monthly'
  
  -- For 'quit' habits
  baseline_frequency INT,                -- How often they were doing it before
  target_max_frequency INT,              -- Max allowed occurrences (for reduction, not elimination)
  
  -- Tracking
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  total_completions INT DEFAULT 0,
  total_failures INT DEFAULT 0,
  completion_rate DECIMAL(5,2),          -- Percentage (0-100)
  
  -- Status
  status VARCHAR(20) DEFAULT 'active',   -- 'active', 'paused', 'completed', 'abandoned'
  
  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  target_completion_date DATE,
  last_completed_at TIMESTAMPTZ,
  last_failed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Reminders
  reminder_enabled BOOLEAN DEFAULT true,
  reminder_time TIME,
  reminder_days VARCHAR(3)[],            -- ['mon', 'wed', 'fri']
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_habit_type CHECK (habit_type IN ('build', 'quit')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'paused', 'completed', 'abandoned'))
);

CREATE INDEX idx_habits_user_status ON habits(user_id, status);
CREATE INDEX idx_habits_category ON habits(category);
CREATE INDEX idx_habits_active ON habits(user_id, status) WHERE status = 'active';

COMMENT ON TABLE habits IS 'User habits to build or quit';
COMMENT ON COLUMN habits.habit_type IS 'build = create new habit, quit = stop existing habit';

-- ============================================
-- 3. HABIT COMPLETIONS TABLE
-- ============================================

CREATE TABLE habit_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  completion_date DATE NOT NULL,
  completion_time TIME,
  
  -- For build habits: did they do it? (true/false)
  -- For quit habits: did they avoid it? (true = avoided, false = relapsed)
  completed BOOLEAN NOT NULL,
  
  -- Optional link to memory
  memory_id UUID REFERENCES memory_units(id),
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(habit_id, completion_date)
);

CREATE INDEX idx_habit_completions_habit ON habit_completions(habit_id, completion_date DESC);
CREATE INDEX idx_habit_completions_user ON habit_completions(user_id, completion_date DESC);

-- ============================================
-- 4. USER ENGAGEMENT TABLE
-- ============================================

CREATE TABLE user_engagement (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  
  -- Activity metrics
  last_activity_date DATE,
  last_activity_time TIMESTAMPTZ,
  total_events INT DEFAULT 0,
  events_last_7_days INT DEFAULT 0,
  events_last_30_days INT DEFAULT 0,
  
  -- Engagement scores
  engagement_score INT CHECK (engagement_score BETWEEN 0 AND 100),
  engagement_trend VARCHAR(20),          -- 'increasing', 'stable', 'declining', 'inactive'
  
  -- Streaks
  current_logging_streak INT DEFAULT 0,
  longest_logging_streak INT DEFAULT 0,
  days_since_last_log INT DEFAULT 0,
  
  -- Drop-off detection
  is_at_risk BOOLEAN DEFAULT false,
  risk_level VARCHAR(20),                -- 'none', 'low', 'medium', 'high', 'churned'
  drop_off_detected_at TIMESTAMPTZ,
  
  -- Re-engagement
  last_nudge_sent_at TIMESTAMPTZ,
  nudge_count INT DEFAULT 0,
  responded_to_last_nudge BOOLEAN,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_trend CHECK (engagement_trend IN ('increasing', 'stable', 'declining', 'inactive')),
  CONSTRAINT valid_risk CHECK (risk_level IN ('none', 'low', 'medium', 'high', 'churned'))
);

CREATE INDEX idx_engagement_user ON user_engagement(user_id);
CREATE INDEX idx_engagement_risk ON user_engagement(is_at_risk, risk_level);
CREATE INDEX idx_engagement_inactive ON user_engagement(days_since_last_log DESC);
CREATE INDEX idx_engagement_score ON user_engagement(engagement_score DESC);

-- ============================================
-- 5. NUDGE CAMPAIGNS TABLE
-- ============================================

CREATE TABLE nudge_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Campaign details
  campaign_type VARCHAR(50) NOT NULL,    -- 'drop_off_1day', 'drop_off_3day', etc.
  trigger_condition TEXT,
  
  -- Message content
  message_title TEXT NOT NULL,
  message_body TEXT NOT NULL,
  message_cta TEXT,
  personalization_data JSONB DEFAULT '{}',
  
  -- Status
  status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled', 'sent', 'failed', 'responded'
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  
  -- Response tracking
  user_returned BOOLEAN DEFAULT false,
  events_added_after_nudge INT DEFAULT 0,
  return_time_hours DECIMAL(10,2),
  
  -- Delivery
  channel VARCHAR(20) DEFAULT 'push',    -- 'push', 'email', 'sms'
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_status CHECK (status IN ('scheduled', 'sent', 'failed', 'responded', 'ignored')),
  CONSTRAINT valid_channel CHECK (channel IN ('push', 'email', 'sms', 'in_app'))
);

CREATE INDEX idx_nudges_user ON nudge_campaigns(user_id, sent_at DESC);
CREATE INDEX idx_nudges_status ON nudge_campaigns(status, scheduled_for);
CREATE INDEX idx_nudges_campaign_type ON nudge_campaigns(campaign_type, status);

-- ============================================
-- 6. CORRELATIONS TABLE
-- ============================================

CREATE TABLE correlations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Correlation details
  correlation_type VARCHAR(50),          -- 'positive', 'negative', 'causal'
  category_a VARCHAR(50),                -- e.g., 'sleep'
  category_b VARCHAR(50),                -- e.g., 'fitness'
  
  -- Statistical measures
  correlation_coefficient DECIMAL(5,3), -- -1 to 1
  confidence_score DECIMAL(5,3),        -- 0 to 1
  p_value DECIMAL(10,8),
  
  -- Insight
  description TEXT NOT NULL,
  actionable_insight TEXT,
  
  -- Evidence
  data_points_count INT,
  supporting_memories UUID[],
  
  -- Status
  status VARCHAR(20) DEFAULT 'active',   -- 'active', 'dismissed', 'acted_upon'
  
  -- Metadata
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  last_validated_at TIMESTAMPTZ,
  
  CONSTRAINT valid_correlation CHECK (correlation_coefficient BETWEEN -1 AND 1),
  CONSTRAINT valid_confidence CHECK (confidence_score BETWEEN 0 AND 1)
);

CREATE INDEX idx_correlations_user ON correlations(user_id, detected_at DESC);
CREATE INDEX idx_correlations_categories ON correlations(user_id, category_a, category_b);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update engagement metrics
CREATE OR REPLACE FUNCTION update_user_engagement()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_engagement (user_id, last_activity_date, last_activity_time, total_events)
  VALUES (NEW.user_id, CURRENT_DATE, NOW(), 1)
  ON CONFLICT (user_id) 
  DO UPDATE SET
    last_activity_date = CURRENT_DATE,
    last_activity_time = NOW(),
    total_events = user_engagement.total_events + 1,
    days_since_last_log = 0,
    current_logging_streak = CASE
      WHEN user_engagement.last_activity_date = CURRENT_DATE - INTERVAL '1 day'
      THEN user_engagement.current_logging_streak + 1
      WHEN user_engagement.last_activity_date = CURRENT_DATE
      THEN user_engagement.current_logging_streak
      ELSE 1
    END,
    longest_logging_streak = GREATEST(
      user_engagement.longest_logging_streak,
      CASE
        WHEN user_engagement.last_activity_date = CURRENT_DATE - INTERVAL '1 day'
        THEN user_engagement.current_logging_streak + 1
        ELSE user_engagement.current_logging_streak
      END
    ),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update engagement on new memory
CREATE TRIGGER trigger_update_engagement
AFTER INSERT ON memory_units
FOR EACH ROW
EXECUTE FUNCTION update_user_engagement();

-- Function to update habit stats
CREATE OR REPLACE FUNCTION update_habit_on_completion()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE habits
  SET
    total_completions = total_completions + CASE WHEN NEW.completed THEN 1 ELSE 0 END,
    total_failures = total_failures + CASE WHEN NOT NEW.completed THEN 1 ELSE 0 END,
    last_completed_at = CASE WHEN NEW.completed THEN NOW() ELSE last_completed_at END,
    last_failed_at = CASE WHEN NOT NEW.completed THEN NOW() ELSE last_failed_at END,
    completion_rate = (
      (total_completions + CASE WHEN NEW.completed THEN 1 ELSE 0 END)::DECIMAL / 
      NULLIF(total_completions + total_failures + 1, 0)
    ) * 100,
    updated_at = NOW()
  WHERE id = NEW.habit_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_habit_stats
AFTER INSERT ON habit_completions
FOR EACH ROW
EXECUTE FUNCTION update_habit_on_completion();

-- ============================================
-- INDEXES FOR ANALYTICS QUERIES
-- ============================================

-- Fast aggregations by date range
CREATE INDEX idx_metrics_aggregations ON metrics(user_id, category, metric_type, metric_date DESC);

-- Habit progress queries
CREATE INDEX idx_habit_progress ON habit_completions(habit_id, completion_date DESC, completed);

-- Engagement analytics
CREATE INDEX idx_engagement_analytics ON user_engagement(engagement_score DESC, days_since_last_log);

COMMENT ON INDEX idx_metrics_aggregations IS 'Optimized for SUM, AVG, COUNT queries by date range';
COMMENT ON INDEX idx_habit_progress IS 'Fast habit streak and completion rate calculations';
