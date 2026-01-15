-- ==========================================
-- MEMORY OS: CORRELATION ENGINE EXTENSION
-- Built on top of existing schema.sql
-- ==========================================

-- This extends the existing correlations table with a more robust analytical layer

-- 1. Metric Definitions (The Dictionary)
-- Defines standardized metrics that can be correlated
CREATE TABLE IF NOT EXISTS metric_definitions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,          -- e.g., 'sleep_duration', 'total_spend', 'mood_score'
    display_name VARCHAR(100),                  -- e.g., 'Sleep Duration (Hours)'
    category VARCHAR(50) NOT NULL,              -- e.g., 'health', 'finance', 'mindfulness'
    
    data_type VARCHAR(20) DEFAULT 'numeric',    -- 'numeric', 'boolean', 'count'
    unit VARCHAR(20),                           -- 'hours', 'INR', 'scale_1_10'
    aggregation_method VARCHAR(20) DEFAULT 'sum', -- 'sum' (expenses), 'avg' (mood), 'max' (streak)
    
    -- Extraction Logic (JSONPath or logic hint for the backend parser)
    extraction_rule JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Daily Metric Aggregates (The Clean Data)
-- Flattens complex memory_units into simple daily numbers for analysis
CREATE TABLE IF NOT EXISTS daily_metrics (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    metric_id INTEGER REFERENCES metric_definitions(id) ON DELETE CASCADE,
    
    date DATE NOT NULL,
    val NUMERIC NOT NULL,                       -- The calculated value (e.g., 7.5 for sleep)
    sample_count INTEGER DEFAULT 1,             -- How many memories contributed to this value
    
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    
    -- Performance optimization: One value per metric per day per user
    UNIQUE(user_id, metric_id, date)
);

-- Index for analytical jobs
CREATE INDEX IF NOT EXISTS idx_daily_metrics_lookup ON daily_metrics(user_id, metric_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON daily_metrics(user_id, date DESC);

-- 3. Enhanced Correlations Table
-- Drop and recreate with proper metric ID references and lag support
DROP TABLE IF EXISTS correlations CASCADE;

CREATE TABLE correlations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- The Relationship (A -> B)
    driver_metric_id INTEGER REFERENCES metric_definitions(id) ON DELETE CASCADE,   -- Cause (e.g., Sleep)
    outcome_metric_id INTEGER REFERENCES metric_definitions(id) ON DELETE CASCADE,  -- Effect (e.g., Productivity)
    
    -- Legacy category support (optional, for backward compatibility)
    category_a VARCHAR(50),
    category_b VARCHAR(50),
    
    -- Statistical Strength
    coefficient DECIMAL(5,3) NOT NULL,          -- -1.0 to +1.0 (Pearson correlation)
    p_value DECIMAL(10,8) NOT NULL,             -- Confidence (target < 0.05)
    sample_size INTEGER NOT NULL,               -- Number of days analyzed
    
    -- Time Dimension (CRITICAL FEATURE)
    lag_days INTEGER DEFAULT 0,                 -- 0=Same Day, 1=Next Day Effect, -1=Previous Day
    
    -- Human Readable Insight
    correlation_type VARCHAR(50),               -- 'positive', 'negative', 'causal'
    description TEXT,                           -- "Higher sleep duration correlates with higher spending."
    actionable_insight TEXT,                    -- "Try sleeping more to be more productive"
    confidence_score DECIMAL(4,3),              -- AI's confidence in this insight (0-1)
    
    -- Evidence
    data_points_count INTEGER,                  -- Same as sample_size, but kept for compatibility
    supporting_memories UUID[],
    
    -- Status
    status VARCHAR(20) DEFAULT 'active',        -- 'active', 'dismissed', 'pinned', 'acted_upon'
    
    -- Metadata
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_validated_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_coefficient CHECK (coefficient BETWEEN -1 AND 1),
    CONSTRAINT valid_confidence CHECK (confidence_score IS NULL OR confidence_score BETWEEN 0 AND 1),
    CONSTRAINT valid_p_value CHECK (p_value >= 0 AND p_value <= 1),
    
    -- Prevent duplicate calculations
    UNIQUE(user_id, driver_metric_id, outcome_metric_id, lag_days)
);

-- Indexes
CREATE INDEX idx_correlations_user ON correlations(user_id, detected_at DESC);
CREATE INDEX idx_correlations_metrics ON correlations(user_id, driver_metric_id, outcome_metric_id);
CREATE INDEX idx_correlations_status ON correlations(user_id, status);
CREATE INDEX idx_correlations_lag ON correlations(lag_days);

-- 4. Correlation Feedback (Improving the AI)
-- Tracks if the user agrees with the correlation
CREATE TABLE IF NOT EXISTS correlation_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    correlation_id UUID REFERENCES correlations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    feedback_type VARCHAR(20),                  -- 'helpful', 'irrelevant', 'wrong', 'insightful'
    user_comment TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_correlation ON correlation_feedback(correlation_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user ON correlation_feedback(user_id);

-- ==========================================
-- SEED DATA: Core Metric Definitions
-- ==========================================

INSERT INTO metric_definitions (name, display_name, category, unit, aggregation_method, extraction_rule) VALUES
-- Health Metrics
('sleep_hours', 'Sleep Duration', 'health', 'hours', 'avg', '{"path": "normalized_data.duration_minutes", "transform": "divide_by_60"}'::jsonb),
('sleep_quality', 'Sleep Quality', 'health', '1-10', 'avg', '{"path": "normalized_data.quality"}'::jsonb),
('weight', 'Body Weight', 'health', 'kg', 'avg', '{"path": "normalized_data.weight"}'::jsonb),
('heart_rate', 'Heart Rate', 'health', 'bpm', 'avg', '{"path": "normalized_data.heart_rate"}'::jsonb),
('blood_pressure_systolic', 'Blood Pressure (Systolic)', 'health', 'mmHg', 'avg', '{"path": "normalized_data.bp_systolic"}'::jsonb),

-- Finance Metrics
('daily_spend', 'Total Spending', 'finance', 'INR', 'sum', '{"path": "normalized_data.amount", "filter": "amount < 0"}'::jsonb),
('daily_income', 'Total Income', 'finance', 'INR', 'sum', '{"path": "normalized_data.amount", "filter": "amount > 0"}'::jsonb),
('transaction_count', 'Transaction Count', 'finance', 'count', 'sum', '{"count": true}'::jsonb),
('spending_food', 'Food Spending', 'finance', 'INR', 'sum', '{"path": "normalized_data.amount", "filter": "category=food"}'::jsonb),
('spending_transport', 'Transport Spending', 'finance', 'INR', 'sum', '{"path": "normalized_data.amount", "filter": "category=transport"}'::jsonb),

-- Mindfulness Metrics
('mood_score', 'Mood Score', 'mindfulness', '1-10', 'avg', '{"path": "normalized_data.mood_score"}'::jsonb),
('meditation_minutes', 'Meditation Duration', 'mindfulness', 'minutes', 'sum', '{"path": "normalized_data.duration_minutes", "filter": "activity=meditation"}'::jsonb),
('meditation_count', 'Meditation Sessions', 'mindfulness', 'count', 'sum', '{"count": true, "filter": "activity=meditation"}'::jsonb),
('gratitude_count', 'Gratitude Entries', 'mindfulness', 'count', 'sum', '{"count": true, "filter": "type=gratitude"}'::jsonb),
('stress_level', 'Stress Level', 'mindfulness', '1-10', 'avg', '{"path": "normalized_data.stress_level"}'::jsonb),

-- Fitness Metrics
('steps_count', 'Daily Steps', 'fitness', 'count', 'sum', '{"path": "normalized_data.steps"}'::jsonb),
('workout_minutes', 'Workout Duration', 'fitness', 'minutes', 'sum', '{"path": "normalized_data.duration_minutes"}'::jsonb),
('workout_count', 'Workout Sessions', 'fitness', 'count', 'sum', '{"count": true, "filter": "category=fitness"}'::jsonb),
('calories_burned', 'Calories Burned', 'fitness', 'kcal', 'sum', '{"path": "normalized_data.calories"}'::jsonb),
('workout_intensity', 'Workout Intensity', 'fitness', '1-10', 'avg', '{"path": "normalized_data.intensity"}'::jsonb),

-- Routine/Productivity Metrics
('productivity_score', 'Focus Level', 'routine', '1-10', 'avg', '{"path": "normalized_data.productivity"}'::jsonb),
('habit_completions', 'Habits Completed', 'routine', 'count', 'sum', '{"count": true, "filter": "type=habit_completion"}'::jsonb),
('screen_time', 'Screen Time', 'routine', 'hours', 'sum', '{"path": "normalized_data.screen_time"}'::jsonb),
('deep_work_hours', 'Deep Work Hours', 'routine', 'hours', 'sum', '{"path": "normalized_data.deep_work"}'::jsonb)

ON CONFLICT (name) DO NOTHING;

-- ==========================================
-- HELPER FUNCTIONS
-- ==========================================

-- Function to calculate lag correlations
CREATE OR REPLACE FUNCTION calculate_correlation(
    p_user_id UUID,
    p_driver_metric_id INTEGER,
    p_outcome_metric_id INTEGER,
    p_lag_days INTEGER DEFAULT 0,
    p_min_sample_size INTEGER DEFAULT 14
)
RETURNS TABLE (
    correlation_coefficient DECIMAL(5,3),
    p_value DECIMAL(10,8),
    sample_size INTEGER
) AS $$
DECLARE
    v_correlation DECIMAL(5,3);
    v_p_value DECIMAL(10,8);
    v_sample_size INTEGER;
BEGIN
    -- This is a placeholder for actual statistical calculation
    -- In production, you'd use a statistics library or call Python/R
    
    -- For now, return mock data
    SELECT 
        ROUND((RANDOM() * 2 - 1)::numeric, 3) as corr,
        ROUND(RANDOM()::numeric, 5) as pval,
        (SELECT COUNT(DISTINCT date) FROM daily_metrics 
         WHERE user_id = p_user_id AND metric_id IN (p_driver_metric_id, p_outcome_metric_id))::INTEGER as samples
    INTO v_correlation, v_p_value, v_sample_size;
    
    RETURN QUERY SELECT v_correlation, v_p_value, v_sample_size;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- COMMENTS
-- ==========================================

COMMENT ON TABLE metric_definitions IS 'Dictionary of standardized metrics for correlation analysis';
COMMENT ON TABLE daily_metrics IS 'Daily aggregated metric values for time-series analysis';
COMMENT ON TABLE correlations IS 'Statistical relationships between metrics with lag support';
COMMENT ON TABLE correlation_feedback IS 'User feedback on correlation insights for ML improvement';

COMMENT ON COLUMN correlations.lag_days IS 'Time offset: 0=same day, 1=next day effect, -1=previous day';
COMMENT ON COLUMN correlations.coefficient IS 'Pearson correlation coefficient: -1 (negative) to +1 (positive)';
COMMENT ON COLUMN correlations.p_value IS 'Statistical significance: < 0.05 is considered significant';
