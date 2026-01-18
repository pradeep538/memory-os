# Scheduled Insights & Notifications System

## Complete Flow

```
Sunday 8 AM → Scheduled Job Runs
       ↓
1. Fetch Python patterns
2. Pick best insight (highest confidence)
3. Generate teaser question (LLM)
4. Create notification (question only, no answer)
5. Send push notification
       ↓
User receives: "🔍 Your Weekly Insight"
Body: "When do you meditate best? 🧘"
       ↓
User opens app → Sees notification card with question
User taps card → Calls reveal API
       ↓
API returns full insight:
"Mornings are your meditation sweet spot - 6 AM sessions have 90% completion! ✨"
```

---

## Scheduled Jobs

### 1. Weekly Insights (Sundays 8 AM)
```javascript
Cron: '0 8 * * 0'

What it does:
1. For each active user:
   - Refresh insights from Python analytics
   - Pick highest confidence insight
   - Generate teaser question via Gemini
   - Create notification (stored in DB)
   - Send push notification (teaser only)
```

### 2. Daily Summary (Every day 11 PM)
```javascript
Cron: '0 23 * * *'

What it does:
- Generate daily summary
- Create notification
- Send to user
```

---

## API Endpoints

### Get Notifications
```bash
GET /api/v1/notifications?limit=20
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "notif-uuid",
      "notification_type": "weekly_insight",
      "title": "🔍 Your Weekly Insight",
      "body": "When do you meditate best? 🧘",
      "created_at": "2026-01-14T08:00:00Z",
      "status": "sent",
      "metadata": {
        "insight_id": "pattern-uuid",
        "insight_type": "time_preference",
        "category": "mindfulness",
        "has_reveal": true  // Frontend knows it's tappable
      }
    }
  ]
}
```

### Reveal Insight (User Taps)
```bash
GET /api/v1/notifications/{id}/reveal
```

**Response:**
```json
{
  "success": true,
  "data": {
    "notification": { /* original notification */ },
    "insight": {
      "id": "pattern-uuid",
      "type": "time_preference",
      "category": "mindfulness",
      "insight": "Mornings are your meditation sweet spot - 6 AM sessions have 90% completion! ✨",
      "confidence": 0.92
    }
  }
}
```

### Manual Trigger (Testing)
```bash
# Trigger weekly insights job immediately
POST /api/v1/notifications/trigger/weekly_insights

# Trigger daily summary
POST /api/v1/notifications/trigger/daily_summary
```

---

## Flutter Integration

### 1. Listen for Push Notifications
```dart
// When notification received
{
  "title": "🔍 Your Weekly Insight",
  "body": "When do you meditate best? 🧘",
  "data": {
    "notification_id": "uuid",
    "has_reveal": true
  }
}

// Show in notification tray (teaser only)
```

### 2. Display in App
```dart
// Home screen shows notification card
Card(
  title: "🔍 Your Weekly Insight",
  subtitle: "When do you meditate best? 🧘",
  trailing: Icon(Icons.arrow_forward),
  onTap: () => revealInsight(notification.id)
)
```

### 3. Reveal on Tap
```dart
Future<void> revealInsight(String notificationId) async {
  final response = await dio.get(
    '$baseUrl/api/v1/notifications/$notificationId/reveal'
  );
  
  if (response.data['success']) {
    // Show full insight with animation
    showInsightDialog(
      question: notification.body,
      answer: response.data['data']['insight']['insight'],
      category: response.data['data']['insight']['category']
    );
  }
}
```

### 4. Insight Dialog
```dart
// Animated reveal dialog
AlertDialog(
  title: Text("🧘 Mindfulness Insight"),
  content: Column(
    children: [
      Text(
        "When do you meditate best?",
        style: TextStyle(fontSize: 16, color: Colors.grey)
      ),
      SizedBox(height: 16),
      AnimatedOpacity(
        opacity: revealed ? 1.0 : 0.0,
        child: Text(
          "Mornings are your meditation sweet spot - 6 AM sessions have 90% completion! ✨",
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)
        )
      )
    ]
  )
)
```

---

## Question Generation Examples

**Python Pattern:**
```json
{
  "pattern_type": "frequency",
  "category": "fitness",
  "activity": "chest workout",
  "frequency_per_week": 3.5,
  "confidence": 0.89
}
```

**Generated Question:**
```
"How consistent are your workouts? 💪"
```

**Revealed Insight:**
```
"You're crushing it with chest workouts - almost 4 times a week! 💪"
```

---

**Python Pattern:**
```json
{
  "pattern_type": "time_preference",
  "category": "mindfulness",
  "activity": "meditation",
  "peak_hour": 6,
  "confidence": 0.92
}
```

**Generated Question:**
```
"When is your meditation sweet spot? 🧘"
```

**Revealed Insight:**
```
"Mornings are your zen time - 6 AM meditation works best for you! ✨"
```

---

## Testing Locally

### 1. Trigger Weekly Insights Manually
```bash
# This will:
# - Generate insights
# - Create teaser question
# - Store notification
curl -X POST http://localhost:3000/api/v1/notifications/trigger/weekly_insights
```

### 2. Get Notifications
```bash
curl http://localhost:3000/api/v1/notifications
```

### 3. Reveal Insight
```bash
# Copy notification ID from previous response
curl http://localhost:3000/api/v1/notifications/{notification-id}/reveal
```

---

## Scheduled Jobs Status

Jobs start automatically when server starts.

**Check logs:**
```
🕐 Starting scheduled jobs...
  ✓ Weekly insights scheduled (Sundays 8 AM)
  ✓ Daily summary scheduled (11 PM)
✅ Scheduled jobs started
```

**Cron Schedule:**
- Weekly: `0 8 * * 0` (Sunday 8 AM)
- Daily: `0 23 * * *` (Every day 11 PM)

---

## Database Schema

### notifications table
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    
    notification_type VARCHAR(100),  -- weekly_insight, daily_summary
    title VARCHAR(255),               -- "🔍 Your Weekly Insight"
    body TEXT,                        -- Teaser question
    
    scheduled_for TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    status VARCHAR(20),               -- pending, sent, failed
    
    -- Links
    related_memory_id UUID,
    related_plan_id UUID,
    
    -- Custom data
    metadata JSONB DEFAULT '{}'       -- { insight_id, has_reveal: true }
);
```

**Metadata Example:**
```json
{
  "insight_id": "pattern-uuid-123",
  "insight_type": "time_preference",
  "category": "mindfulness",
  "has_reveal": true
}
```

---

##  Benefits

### Curiosity-Driven UX
✅ Teaser creates anticipation
✅ User *wants* to tap (not passive reading)
✅ Gamification without being childish
✅ Memorable "aha moments"

### Performance
✅ Jobs run in background
✅ No blocking user requests
✅ Scheduled predictably

### Scalability
✅ Node-cron handles scheduling
✅ Notifications stored in DB
✅ Can batch process users

### Engagement
✅ Weekly habit loop ("Sundays are insight day")
✅ Push notification drives app opens
✅ Reveal mechanic encourages interaction

---

This system implements your "viral feature" #2: **"Life Pattern Reveal" (Weekly AI Insight Drop)**!
