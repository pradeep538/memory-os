# Memory OS - End-to-End Test Plan

## Overview

This document outlines a comprehensive test plan for Memory OS, covering authentication, input processing, all features, and strategies for testing time-dependent features using historical data.

---

## Table of Contents

1. [Pre-requisites & Environment Setup](#1-pre-requisites--environment-setup)
2. [Phase 1: Authentication Testing](#2-phase-1-authentication-testing)
3. [Phase 2: Input Processing (Voice/Text → LLM)](#3-phase-2-input-processing-voicetext--llm)
4. [Phase 3: Core Features Testing](#4-phase-3-core-features-testing)
5. [Phase 4: Test Data Seeding for Analytics](#5-phase-4-test-data-seeding-for-analytics)
6. [Phase 5: Analytics & Insights Testing](#6-phase-5-analytics--insights-testing)
7. [Phase 6: Integration Testing](#7-phase-6-integration-testing)
8. [Test Checklist](#8-test-checklist)

---

## 1. Pre-requisites & Environment Setup

### 1.1 Backend Setup

```bash
cd /Users/geetag/Documents/memory-os/backend

# Check environment variables
cat .env

# Required variables:
# - DATABASE_URL=postgresql://...
# - GEMINI_API_KEY=your_api_key
# - PORT=3000

# Start backend
npm run dev
```

**Verify Backend is Running:**
```bash
curl http://localhost:3000/health
# Expected: {"status":"healthy","database":"connected"}
```

### 1.2 Analytics Service (Python)

```bash
cd /Users/geetag/Documents/memory-os/analytics-service

# Activate virtual environment
source venv/bin/activate

# Start service
uvicorn app.main:app --port 8001 --reload
```

### 1.3 Flutter App

```bash
cd /Users/geetag/Documents/memory-os/flutter_app

# For Android Emulator - Update config.dart:
# apiBaseUrl = 'http://10.0.2.2:3000/api/v1'

# For iOS Simulator:
# apiBaseUrl = 'http://localhost:3000/api/v1'

# For Physical Device:
# apiBaseUrl = 'http://<YOUR_LOCAL_IP>:3000/api/v1'

flutter run
```

### 1.4 Database Access

```bash
# Connect to PostgreSQL
psql $DATABASE_URL

# Or via Docker
docker exec -it memory-os-db psql -U postgres -d memory_os
```

---

## 2. Phase 1: Authentication Testing

### 2.1 Firebase Auth Setup Verification

**Files to Check:**
- `flutter_app/lib/firebase_options.dart` - Firebase config exists
- `flutter_app/android/app/google-services.json` - Android config
- `flutter_app/lib/services/auth_service.dart` - Auth service implementation

### 2.2 Test Cases

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| A1 | Google Sign-In | 1. Launch app<br>2. Tap "Continue with Google"<br>3. Select Google account | - Redirects to MainShell<br>- User displayed in profile |
| A2 | Email Sign-In | 1. Enter email<br>2. Enter password<br>3. Tap Sign In | - Redirects to MainShell<br>- Email shown in profile |
| A3 | Phone Sign-In | 1. Enter phone number<br>2. Receive OTP<br>3. Enter OTP | - Redirects to MainShell<br>- Phone verified |
| A4 | Sign Out | 1. Go to Profile<br>2. Tap Sign Out | - Redirects to SignInScreen<br>- Auth state cleared |
| A5 | Auth Persistence | 1. Sign in<br>2. Kill app<br>3. Reopen app | - Still signed in<br>- No login screen |
| A6 | Auth Token | 1. Sign in<br>2. Check `AuthService.getIdToken()` | - Returns valid JWT token |

### 2.3 Debug Commands

```dart
// In Flutter DevTools console:
import 'package:firebase_auth/firebase_auth.dart';
print(FirebaseAuth.instance.currentUser?.uid);
print(await FirebaseAuth.instance.currentUser?.getIdToken());
```

---

## 3. Phase 2: Input Processing (Voice/Text → LLM)

### 3.1 Issue Identified

**Problem:** Text/Voice input not reaching LLM

**Diagnostic Steps:**

#### Step 1: Test Backend Directly

```bash
# Test text input endpoint directly
curl -X POST http://localhost:3000/api/v1/input/text \
  -H "Content-Type: application/json" \
  -d '{"text": "went to gym for 1 hour leg workout"}'
```

**Expected Response:**
```json
{
  "success": true,
  "auto_processed": true,
  "memory": { "id": "...", "category": "fitness" },
  "enhancement": {
    "enhanced_text": "Went to the gym for a 1-hour leg workout",
    "confidence": 0.92
  }
}
```

**If this fails:** Check Gemini API key and LLM service.

#### Step 2: Check LLM Service

```bash
# Check if Gemini API key is set
grep GEMINI_API_KEY backend/.env

# Test LLM directly in Node REPL
node
> const { GoogleGenAI } = require('@google/genai');
> const ai = new GoogleGenAI({ apiKey: 'YOUR_KEY' });
> const result = await ai.models.generateContent({
    model: 'gemini-2.0-flash-exp',
    contents: 'Hello world'
  });
> console.log(result.text);
```

#### Step 3: Test Flutter → Backend Connection

Add logging to Flutter:

```dart
// In input_service.dart, add debug logging:
Future<ApiResponse<InputResult>> processText(String text) async {
  print('🔵 Sending text to backend: $text');
  print('🔵 URL: ${_client.baseUrl}/input/text');

  final response = await _client.post<InputResult>(
    '/input/text',
    body: {'text': text},
    fromJson: (json) => InputResult.fromJson(json),
  );

  print('🔵 Response: ${response.success} - ${response.error}');
  return response;
}
```

### 3.2 Common Issues & Fixes

| Issue | Symptom | Fix |
|-------|---------|-----|
| Network Error | `SocketException` | Check `apiBaseUrl` matches device type |
| CORS Error | Request blocked | Backend CORS is configured ✓ |
| Gemini API Error | LLM timeout | Check `GEMINI_API_KEY` is valid |
| Auth Header Missing | 401 error | Token not being sent (see below) |

### 3.3 Auth Integration Fix Needed

**Current State:** Backend uses hardcoded userId
**Required:** Pass Firebase ID token to backend

**Flutter ApiClient Update:**

```dart
// api_client.dart - Add auth header
class ApiClient {
  final AuthService _authService = AuthService();

  Future<Map<String, String>> get _headers async {
    final token = await _authService.getIdToken();
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }
}
```

**Backend Auth Middleware:**

```javascript
// middleware/auth.js
import admin from 'firebase-admin';

export async function verifyAuth(request, reply) {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    request.userId = decoded.uid;
  } catch (error) {
    return reply.code(401).send({ error: 'Invalid token' });
  }
}
```

### 3.4 Test Cases

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| I1 | Text Input - High Confidence | Enter: "gym leg workout 1 hour" | Auto-saved, shows confirmation |
| I2 | Text Input - Low Confidence | Enter: "did thing morning" | Shows confirmation screen |
| I3 | Voice Input | Record: "Spent fifty dollars on groceries" | Transcribed, categorized as finance |
| I4 | Voice Quota | Use all daily voice quota | Shows quota exceeded message |
| I5 | Input Confirmation | Confirm low-confidence input | Memory saved with user edits |

---

## 4. Phase 3: Core Features Testing

### 4.1 Memory Management

| # | Test | Endpoint | Expected |
|---|------|----------|----------|
| M1 | List Memories | GET `/memory` | Returns array of memories |
| M2 | Filter by Category | GET `/memory?category=fitness` | Only fitness memories |
| M3 | Date Range | GET `/memory?startDate=2024-01-01` | Filtered by date |
| M4 | Single Memory | GET `/memory/:id` | Returns memory details |
| M5 | Category Stats | GET `/memory/stats/categories` | Category counts |

### 4.2 Habits

| # | Test | Endpoint | Expected |
|---|------|----------|----------|
| H1 | Create Habit | POST `/habits` | Habit created |
| H2 | List Habits | GET `/habits` | Array of habits |
| H3 | Complete Habit | POST `/habits/:id/complete` | Completion logged |
| H4 | Progress | GET `/habits/:id/progress` | Progress stats |
| H5 | Suggestions | GET `/habits/suggestions` | AI-generated suggestions |

### 4.3 Engagement

| # | Test | Endpoint | Expected |
|---|------|----------|----------|
| E1 | Get Summary | GET `/engagement/summary` | Score, streaks, activity |
| E2 | Get Analytics | GET `/engagement/analytics` | Daily activity data |
| E3 | Get Streaks | GET `/engagement/streaks` | Streak history |
| E4 | Get Milestones | GET `/engagement/milestones` | Achieved/upcoming |
| E5 | Refresh Score | POST `/engagement/refresh` | Updated score |

### 4.4 Natural Language Query

| # | Test | Query | Expected |
|---|------|-------|----------|
| Q1 | Aggregate | "How much did I spend on food?" | Total amount |
| Q2 | Count | "How many workouts this week?" | Count number |
| Q3 | Find Last | "When did I last meditate?" | Date/time |
| Q4 | List | "Show my recent expenses" | List of items |
| Q5 | Timeline | "My workouts per week" | Weekly breakdown |

---

## 5. Phase 4: Test Data Seeding for Analytics

### 5.1 Why We Need Historical Data

Features like **patterns**, **correlations**, **insights**, and **engagement** require historical data spanning multiple weeks to produce meaningful results. We need to insert test data with past timestamps.

### 5.2 Test Data SQL Script

```sql
-- File: backend/scripts/seed_test_data.sql

-- Get demo user ID (or create user)
DO $$
DECLARE
    test_user_id UUID := '00000000-0000-0000-0000-000000000000';
    base_date DATE := CURRENT_DATE - INTERVAL '60 days';
    i INTEGER;
BEGIN
    -- Clear existing test data (optional)
    -- DELETE FROM memory_units WHERE user_id = test_user_id;

    -- =========================================================================
    -- FITNESS MEMORIES (3-4x per week for 60 days)
    -- =========================================================================
    FOR i IN 0..59 LOOP
        -- Workout on Mon, Wed, Fri, Sat
        IF EXTRACT(DOW FROM (base_date + i)) IN (1, 3, 5, 6) THEN
            INSERT INTO memory_units (
                user_id, raw_input, source, event_type, category,
                normalized_data, confidence_score, status, created_at
            ) VALUES (
                test_user_id,
                CASE WHEN RANDOM() < 0.5
                    THEN 'Did chest workout for 45 minutes'
                    ELSE 'Leg day at gym for 1 hour'
                END,
                'text',
                'activity',
                'fitness',
                jsonb_build_object(
                    'activity', CASE WHEN RANDOM() < 0.5 THEN 'chest workout' ELSE 'leg workout' END,
                    'duration_minutes', CASE WHEN RANDOM() < 0.5 THEN 45 ELSE 60 END,
                    'location', 'gym'
                ),
                0.95,
                'validated',
                (base_date + i + TIME '07:30:00')::TIMESTAMP
            );
        END IF;
    END LOOP;

    -- =========================================================================
    -- MINDFULNESS MEMORIES (5x per week for 60 days)
    -- =========================================================================
    FOR i IN 0..59 LOOP
        -- Meditation on weekdays
        IF EXTRACT(DOW FROM (base_date + i)) BETWEEN 1 AND 5 THEN
            INSERT INTO memory_units (
                user_id, raw_input, source, event_type, category,
                normalized_data, confidence_score, status, created_at
            ) VALUES (
                test_user_id,
                'Meditated for 20 minutes',
                'voice',
                'activity',
                'mindfulness',
                jsonb_build_object(
                    'activity', 'meditation',
                    'duration_minutes', 20
                ),
                0.92,
                'validated',
                (base_date + i + TIME '06:00:00')::TIMESTAMP
            );
        END IF;
    END LOOP;

    -- =========================================================================
    -- FINANCE MEMORIES (Various expenses over 60 days)
    -- =========================================================================
    FOR i IN 0..59 LOOP
        -- Daily small expense
        INSERT INTO memory_units (
            user_id, raw_input, source, event_type, category,
            normalized_data, confidence_score, status, created_at
        ) VALUES (
            test_user_id,
            'Spent ' || (FLOOR(RANDOM() * 500) + 50)::TEXT || ' on ' ||
                CASE (FLOOR(RANDOM() * 4))::INT
                    WHEN 0 THEN 'groceries'
                    WHEN 1 THEN 'food delivery'
                    WHEN 2 THEN 'transport'
                    ELSE 'shopping'
                END,
            'text',
            'transaction',
            'finance',
            jsonb_build_object(
                'amount', (FLOOR(RANDOM() * 500) + 50),
                'subcategory', CASE (FLOOR(RANDOM() * 4))::INT
                    WHEN 0 THEN 'groceries'
                    WHEN 1 THEN 'food delivery'
                    WHEN 2 THEN 'transport'
                    ELSE 'shopping'
                END
            ),
            0.88,
            'validated',
            (base_date + i + TIME '12:00:00')::TIMESTAMP
        );

        -- Weekend larger expense
        IF EXTRACT(DOW FROM (base_date + i)) IN (0, 6) THEN
            INSERT INTO memory_units (
                user_id, raw_input, source, event_type, category,
                normalized_data, confidence_score, status, created_at
            ) VALUES (
                test_user_id,
                'Dinner with friends, spent 1500',
                'text',
                'transaction',
                'finance',
                jsonb_build_object(
                    'amount', 1500,
                    'subcategory', 'dining out'
                ),
                0.90,
                'validated',
                (base_date + i + TIME '20:00:00')::TIMESTAMP
            );
        END IF;
    END LOOP;

    -- =========================================================================
    -- HEALTH MEMORIES (Daily vitamins, occasional symptoms)
    -- =========================================================================
    FOR i IN 0..59 LOOP
        -- Daily vitamin
        INSERT INTO memory_units (
            user_id, raw_input, source, event_type, category,
            normalized_data, confidence_score, status, created_at
        ) VALUES (
            test_user_id,
            'Took vitamin D and omega 3',
            'text',
            'routine',
            'health',
            jsonb_build_object(
                'item', 'vitamins',
                'items', ARRAY['vitamin D', 'omega 3']
            ),
            0.95,
            'validated',
            (base_date + i + TIME '08:00:00')::TIMESTAMP
        );
    END LOOP;

    -- =========================================================================
    -- ROUTINE MEMORIES (Sleep, water, etc.)
    -- =========================================================================
    FOR i IN 0..59 LOOP
        -- Sleep log
        INSERT INTO memory_units (
            user_id, raw_input, source, event_type, category,
            normalized_data, confidence_score, status, created_at
        ) VALUES (
            test_user_id,
            'Slept ' || (FLOOR(RANDOM() * 3) + 6)::TEXT || ' hours',
            'text',
            'routine',
            'routine',
            jsonb_build_object(
                'activity', 'sleep',
                'duration_hours', (FLOOR(RANDOM() * 3) + 6)
            ),
            0.90,
            'validated',
            (base_date + i + TIME '07:00:00')::TIMESTAMP
        );
    END LOOP;

    -- =========================================================================
    -- UPDATE ENGAGEMENT METRICS
    -- =========================================================================
    INSERT INTO user_engagement (
        user_id, total_events, current_logging_streak,
        longest_logging_streak, days_since_last_log,
        engagement_score, last_activity_date
    ) VALUES (
        test_user_id,
        300, -- Approximate total events
        14,  -- Current streak
        21,  -- Longest streak
        0,   -- Days since last
        75,  -- Engagement score
        CURRENT_TIMESTAMP
    ) ON CONFLICT (user_id) DO UPDATE SET
        total_events = 300,
        current_logging_streak = 14,
        longest_logging_streak = 21,
        days_since_last_log = 0,
        engagement_score = 75,
        last_activity_date = CURRENT_TIMESTAMP;

    RAISE NOTICE 'Test data seeded successfully!';
END $$;
```

### 5.3 Run Seed Script

```bash
# Execute the seed script
psql $DATABASE_URL -f backend/scripts/seed_test_data.sql

# Verify data was inserted
psql $DATABASE_URL -c "SELECT category, COUNT(*) FROM memory_units GROUP BY category;"
```

**Expected Output:**
```
  category   | count
-------------+-------
 fitness     |    34
 mindfulness |    43
 finance     |   105
 health      |    60
 routine     |    60
```

---

## 6. Phase 5: Analytics & Insights Testing

### 6.1 Pattern Detection

**Trigger Pattern Analysis:**
```bash
# Call Python analytics service
curl http://localhost:8001/api/v1/patterns/00000000-0000-0000-0000-000000000000
```

**Expected Patterns:**
- "You work out 3.5x per week on average"
- "You meditate around 6 AM"
- "You spend most on food delivery"

### 6.2 Insights

```bash
# Get insights (will trigger LLM natural language)
curl http://localhost:3000/api/v1/insights
```

### 6.3 Correlations

```bash
# Calculate correlations
curl -X POST http://localhost:3000/api/v1/correlations/calculate

# View correlations
curl http://localhost:3000/api/v1/correlations
```

**Expected Correlations:**
- Sleep hours ↔ Workout completion
- Meditation ↔ Spending patterns

### 6.4 Engagement Score

```bash
# Refresh engagement score
curl -X POST http://localhost:3000/api/v1/engagement/refresh

# Get summary
curl http://localhost:3000/api/v1/engagement/summary
```

---

## 7. Phase 6: Integration Testing

### 7.1 Full User Journey Test

```
1. Sign up with Google ─────────────────────────┐
                                                │
2. View onboarding screens                      │
                                                │
3. Arrive at Feed screen (empty state)          │
                                                │
4. Tap voice input ─────────────────────────────┼─► Voice → Backend → Gemini → DB
                                                │
5. Say "Gym workout for 1 hour"                 │
                                                │
6. See confirmation overlay                     │
                                                │
7. Memory appears in feed                       │
                                                │
8. Check Profile → Engagement Score             │
                                                │
9. View Patterns screen (after seeding)         │
                                                │
10. Ask query: "How many workouts this week?"   │
                                                │
11. View Habits → See AI suggestions            │
                                                │
12. Sign out                                    │
                                                ▼
                                          Complete!
```

### 7.2 API Response Time Benchmarks

| Endpoint | Target | Acceptable |
|----------|--------|------------|
| Text Input | < 2s | < 5s |
| Voice Input | < 4s | < 8s |
| Memory List | < 500ms | < 1s |
| Engagement Summary | < 1s | < 2s |
| Pattern Detection | < 3s | < 5s |
| Natural Query | < 3s | < 5s |

---

## 8. Test Checklist

### Authentication
- [ ] Google Sign-In works
- [ ] Email Sign-In works
- [ ] Phone Sign-In works
- [ ] Sign Out works
- [ ] Auth persistence works
- [ ] ID token retrievable

### Input Processing
- [ ] Text input reaches backend
- [ ] Gemini API key valid
- [ ] LLM enhancement works
- [ ] High confidence auto-saves
- [ ] Low confidence shows confirmation
- [ ] Voice recording works
- [ ] Voice transcription works
- [ ] Voice quota enforced

### Core Features
- [ ] Memories list loads
- [ ] Memories filter by category
- [ ] Habits CRUD works
- [ ] Habit completion logging
- [ ] Engagement score displays
- [ ] Streaks show correctly
- [ ] Milestones display

### Analytics (requires seeded data)
- [ ] Patterns detected
- [ ] Insights generated
- [ ] Correlations calculated
- [ ] Natural language queries work
- [ ] Habit suggestions work

### UI/UX
- [ ] Feed loads widgets
- [ ] Navigation works
- [ ] Pull-to-refresh works
- [ ] Detail screens load
- [ ] Error states display
- [ ] Loading states display

---

## Debugging Commands

### Backend Logs
```bash
# Watch backend logs
cd backend && npm run dev 2>&1 | tee backend.log
```

### Database Queries
```sql
-- Check recent memories
SELECT id, category, raw_input, created_at
FROM memory_units
ORDER BY created_at DESC
LIMIT 10;

-- Check engagement
SELECT * FROM user_engagement;

-- Check patterns
SELECT * FROM patterns ORDER BY confidence_score DESC;
```

### Flutter Debug
```dart
// Add to any screen
import 'dart:developer' as dev;
dev.log('Debug: $variable');
```

---

## Next Steps

1. **Immediate:** Fix auth token passing from Flutter to Backend
2. **Short-term:** Run seed script and test analytics features
3. **Medium-term:** Add comprehensive error handling
4. **Long-term:** Add automated E2E tests with Flutter Driver
