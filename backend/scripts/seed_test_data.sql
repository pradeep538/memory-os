-- ============================================================================
-- Memory OS - Test Data Seeding Script
-- ============================================================================
-- This script inserts 60 days of historical data for testing:
-- - Pattern detection
-- - Correlation analysis
-- - Insights generation
-- - Engagement scoring
-- ============================================================================

DO $$
DECLARE
    test_user_id UUID := '00000000-0000-0000-0000-000000000000';
    base_date DATE := CURRENT_DATE - INTERVAL '60 days';
    i INTEGER;
    workout_types TEXT[] := ARRAY['chest workout', 'leg workout', 'back workout', 'shoulder workout', 'cardio', 'HIIT'];
    expense_categories TEXT[] := ARRAY['groceries', 'food delivery', 'transport', 'shopping', 'entertainment', 'utilities'];
BEGIN
    RAISE NOTICE 'Starting test data seeding...';
    RAISE NOTICE 'Base date: %', base_date;

    -- =========================================================================
    -- FITNESS MEMORIES (3-4x per week for 60 days)
    -- Pattern: Usually works out Mon, Wed, Fri, Sat around 7:30 AM
    -- =========================================================================
    RAISE NOTICE 'Seeding fitness data...';

    FOR i IN 0..59 LOOP
        -- Workout on Mon(1), Wed(3), Fri(5), Sat(6)
        IF EXTRACT(DOW FROM (base_date + i)) IN (1, 3, 5, 6) THEN
            INSERT INTO memory_units (
                user_id, raw_input, source, event_type, category,
                normalized_data, confidence_score, status, created_at
            ) VALUES (
                test_user_id,
                'Did ' || workout_types[1 + (FLOOR(RANDOM() * 6))::INT] || ' for ' ||
                    (FLOOR(RANDOM() * 30) + 30)::TEXT || ' minutes',
                CASE WHEN RANDOM() < 0.7 THEN 'voice' ELSE 'text' END,
                'activity',
                'fitness',
                jsonb_build_object(
                    'activity', workout_types[1 + (FLOOR(RANDOM() * 6))::INT],
                    'duration_minutes', (FLOOR(RANDOM() * 30) + 30)::INT,
                    'location', 'gym',
                    'intensity', CASE WHEN RANDOM() < 0.3 THEN 'high' ELSE 'medium' END
                ),
                0.90 + (RANDOM() * 0.1),
                'validated',
                (base_date + i)::TIMESTAMP + TIME '07:30:00' + (RANDOM() * INTERVAL '30 minutes')
            );
        END IF;
    END LOOP;

    -- =========================================================================
    -- MINDFULNESS MEMORIES (5x per week for 60 days)
    -- Pattern: Meditates weekday mornings at 6 AM
    -- =========================================================================
    RAISE NOTICE 'Seeding mindfulness data...';

    FOR i IN 0..59 LOOP
        -- Meditation on weekdays (Mon-Fri: 1-5)
        IF EXTRACT(DOW FROM (base_date + i)) BETWEEN 1 AND 5 THEN
            INSERT INTO memory_units (
                user_id, raw_input, source, event_type, category,
                normalized_data, confidence_score, status, created_at
            ) VALUES (
                test_user_id,
                'Meditated for ' || (FLOOR(RANDOM() * 15) + 10)::TEXT || ' minutes',
                'voice',
                'activity',
                'mindfulness',
                jsonb_build_object(
                    'activity', 'meditation',
                    'duration_minutes', (FLOOR(RANDOM() * 15) + 10)::INT,
                    'mood', CASE WHEN RANDOM() < 0.7 THEN 'calm' ELSE 'focused' END
                ),
                0.92 + (RANDOM() * 0.08),
                'validated',
                (base_date + i)::TIMESTAMP + TIME '06:00:00' + (RANDOM() * INTERVAL '15 minutes')
            );
        END IF;

        -- Occasional weekend meditation
        IF EXTRACT(DOW FROM (base_date + i)) IN (0, 6) AND RANDOM() < 0.3 THEN
            INSERT INTO memory_units (
                user_id, raw_input, source, event_type, category,
                normalized_data, confidence_score, status, created_at
            ) VALUES (
                test_user_id,
                'Morning yoga session for 30 minutes',
                'text',
                'activity',
                'mindfulness',
                jsonb_build_object(
                    'activity', 'yoga',
                    'duration_minutes', 30
                ),
                0.95,
                'validated',
                (base_date + i)::TIMESTAMP + TIME '08:00:00'
            );
        END IF;
    END LOOP;

    -- =========================================================================
    -- FINANCE MEMORIES (Daily expenses over 60 days)
    -- Pattern: Higher spending on weekends, food delivery correlation
    -- =========================================================================
    RAISE NOTICE 'Seeding finance data...';

    FOR i IN 0..59 LOOP
        -- Daily small expense (lunch/snacks)
        INSERT INTO memory_units (
            user_id, raw_input, source, event_type, category,
            normalized_data, confidence_score, status, created_at
        ) VALUES (
            test_user_id,
            'Spent ' || (FLOOR(RANDOM() * 300) + 100)::TEXT || ' on ' ||
                expense_categories[1 + (FLOOR(RANDOM() * 6))::INT],
            'text',
            'transaction',
            'finance',
            jsonb_build_object(
                'amount', (FLOOR(RANDOM() * 300) + 100)::INT,
                'subcategory', expense_categories[1 + (FLOOR(RANDOM() * 6))::INT],
                'type', 'expense'
            ),
            0.85 + (RANDOM() * 0.15),
            'validated',
            (base_date + i)::TIMESTAMP + TIME '13:00:00' + (RANDOM() * INTERVAL '2 hours')
        );

        -- Weekend dining out (higher amounts)
        IF EXTRACT(DOW FROM (base_date + i)) IN (0, 6) THEN
            INSERT INTO memory_units (
                user_id, raw_input, source, event_type, category,
                normalized_data, confidence_score, status, created_at
            ) VALUES (
                test_user_id,
                'Dinner out, spent ' || (FLOOR(RANDOM() * 1000) + 800)::TEXT,
                'text',
                'transaction',
                'finance',
                jsonb_build_object(
                    'amount', (FLOOR(RANDOM() * 1000) + 800)::INT,
                    'subcategory', 'dining out',
                    'type', 'expense'
                ),
                0.90,
                'validated',
                (base_date + i)::TIMESTAMP + TIME '20:00:00'
            );
        END IF;

        -- Food delivery on workout days (correlation test)
        IF EXTRACT(DOW FROM (base_date + i)) IN (1, 3, 5) AND RANDOM() < 0.6 THEN
            INSERT INTO memory_units (
                user_id, raw_input, source, event_type, category,
                normalized_data, confidence_score, status, created_at
            ) VALUES (
                test_user_id,
                'Ordered food, spent ' || (FLOOR(RANDOM() * 200) + 250)::TEXT,
                'text',
                'transaction',
                'finance',
                jsonb_build_object(
                    'amount', (FLOOR(RANDOM() * 200) + 250)::INT,
                    'subcategory', 'food delivery',
                    'type', 'expense'
                ),
                0.88,
                'validated',
                (base_date + i)::TIMESTAMP + TIME '19:30:00'
            );
        END IF;
    END LOOP;

    -- =========================================================================
    -- HEALTH MEMORIES (Daily vitamins, water, occasional symptoms)
    -- =========================================================================
    RAISE NOTICE 'Seeding health data...';

    FOR i IN 0..59 LOOP
        -- Daily vitamins
        INSERT INTO memory_units (
            user_id, raw_input, source, event_type, category,
            normalized_data, confidence_score, status, created_at
        ) VALUES (
            test_user_id,
            'Took vitamins - D3, omega 3, B12',
            'text',
            'routine',
            'health',
            jsonb_build_object(
                'activity', 'vitamins',
                'items', ARRAY['vitamin D3', 'omega 3', 'B12']
            ),
            0.95,
            'validated',
            (base_date + i)::TIMESTAMP + TIME '08:30:00'
        );

        -- Water tracking (some days)
        IF RANDOM() < 0.7 THEN
            INSERT INTO memory_units (
                user_id, raw_input, source, event_type, category,
                normalized_data, confidence_score, status, created_at
            ) VALUES (
                test_user_id,
                'Drank ' || (FLOOR(RANDOM() * 4) + 6)::TEXT || ' glasses of water',
                'text',
                'routine',
                'health',
                jsonb_build_object(
                    'activity', 'hydration',
                    'glasses', (FLOOR(RANDOM() * 4) + 6)::INT
                ),
                0.90,
                'validated',
                (base_date + i)::TIMESTAMP + TIME '21:00:00'
            );
        END IF;

        -- Occasional headache (for correlation with sleep/screen time)
        IF RANDOM() < 0.15 THEN
            INSERT INTO memory_units (
                user_id, raw_input, source, event_type, category,
                normalized_data, confidence_score, status, created_at
            ) VALUES (
                test_user_id,
                'Had a mild headache today',
                'text',
                'health',
                'health',
                jsonb_build_object(
                    'symptom', 'headache',
                    'severity', 'mild'
                ),
                0.85,
                'validated',
                (base_date + i)::TIMESTAMP + TIME '15:00:00'
            );
        END IF;
    END LOOP;

    -- =========================================================================
    -- ROUTINE MEMORIES (Sleep tracking)
    -- Pattern: Better sleep on workout days
    -- =========================================================================
    RAISE NOTICE 'Seeding routine data...';

    FOR i IN 0..59 LOOP
        -- Sleep log
        INSERT INTO memory_units (
            user_id, raw_input, source, event_type, category,
            normalized_data, confidence_score, status, created_at
        ) VALUES (
            test_user_id,
            'Slept ' || (
                CASE
                    -- Better sleep after workout days
                    WHEN EXTRACT(DOW FROM (base_date + i - 1)) IN (1, 3, 5, 6)
                    THEN (FLOOR(RANDOM() * 1.5) + 7)::TEXT
                    ELSE (FLOOR(RANDOM() * 2) + 5.5)::TEXT
                END
            ) || ' hours',
            'text',
            'routine',
            'routine',
            jsonb_build_object(
                'activity', 'sleep',
                'duration_hours', CASE
                    WHEN EXTRACT(DOW FROM (base_date + i - 1)) IN (1, 3, 5, 6)
                    THEN (FLOOR(RANDOM() * 1.5) + 7)
                    ELSE (FLOOR(RANDOM() * 2) + 5.5)
                END,
                'quality', CASE
                    WHEN EXTRACT(DOW FROM (base_date + i - 1)) IN (1, 3, 5, 6)
                    THEN 'good'
                    ELSE 'average'
                END
            ),
            0.90,
            'validated',
            (base_date + i)::TIMESTAMP + TIME '07:00:00'
        );
    END LOOP;

    -- =========================================================================
    -- UPDATE/CREATE ENGAGEMENT RECORD
    -- =========================================================================
    RAISE NOTICE 'Updating engagement metrics...';

    INSERT INTO user_engagement (
        user_id,
        total_events,
        current_logging_streak,
        longest_logging_streak,
        days_since_last_log,
        engagement_score,
        last_activity_date,
        created_at,
        updated_at
    ) VALUES (
        test_user_id,
        (SELECT COUNT(*) FROM memory_units WHERE user_id = test_user_id),
        14,
        21,
        0,
        75,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (user_id) DO UPDATE SET
        total_events = (SELECT COUNT(*) FROM memory_units WHERE user_id = test_user_id),
        current_logging_streak = 14,
        longest_logging_streak = GREATEST(user_engagement.longest_logging_streak, 21),
        days_since_last_log = 0,
        engagement_score = 75,
        last_activity_date = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP;

    -- =========================================================================
    -- CREATE TEST HABITS
    -- =========================================================================
    RAISE NOTICE 'Creating test habits...';

    INSERT INTO habits (
        user_id, habit_name, habit_type, category,
        target_frequency, target_frequency_unit,
        current_streak, longest_streak, completion_rate,
        status, created_at
    ) VALUES
    (
        test_user_id, 'Morning Workout', 'build', 'fitness',
        4, 'weekly', 3, 7, 0.75, 'active', CURRENT_TIMESTAMP - INTERVAL '30 days'
    ),
    (
        test_user_id, 'Daily Meditation', 'build', 'mindfulness',
        5, 'weekly', 5, 12, 0.85, 'active', CURRENT_TIMESTAMP - INTERVAL '45 days'
    ),
    (
        test_user_id, 'Reduce Food Delivery', 'quit', 'finance',
        8, 'monthly', 0, 0, 0.60, 'active', CURRENT_TIMESTAMP - INTERVAL '20 days'
    )
    ON CONFLICT DO NOTHING;

    -- =========================================================================
    -- SUMMARY
    -- =========================================================================
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Test data seeding completed!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Memories created: %', (SELECT COUNT(*) FROM memory_units WHERE user_id = test_user_id);
    RAISE NOTICE 'Date range: % to %', base_date, CURRENT_DATE;
    RAISE NOTICE '';
    RAISE NOTICE 'Category breakdown:';

END $$;

-- Show summary
SELECT
    category,
    COUNT(*) as count,
    MIN(created_at::date) as earliest,
    MAX(created_at::date) as latest
FROM memory_units
WHERE user_id = '00000000-0000-0000-0000-000000000000'
GROUP BY category
ORDER BY count DESC;
