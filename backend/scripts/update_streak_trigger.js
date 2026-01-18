import db from '../src/db/index.js';

const sql = `
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
      WHEN user_engagement.last_activity_date = CURRENT_DATE - 1 THEN user_engagement.current_logging_streak + 1
      WHEN user_engagement.last_activity_date = CURRENT_DATE THEN user_engagement.current_logging_streak
      ELSE 1
    END,
    longest_logging_streak = GREATEST(
      user_engagement.longest_logging_streak,
      CASE
        WHEN user_engagement.last_activity_date = CURRENT_DATE - 1 THEN user_engagement.current_logging_streak + 1
        WHEN user_engagement.last_activity_date = CURRENT_DATE THEN user_engagement.current_logging_streak
        ELSE 1
      END
    ),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
`;

async function run() {
    try {
        await db.query(sql);
        console.log('✅ Trigger update_user_engagement updated successfully');
        process.exit(0);
    } catch (err) {
        console.error('❌ Failed to update trigger:', err);
        process.exit(1);
    }
}

run();
