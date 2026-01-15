# Insights Integration - How It Works

## The Complete Flow

```
1. User logs memories (text/voice)
       ↓
2. Stored in memory_units table
       ↓
3. Python Analytics detects patterns (statistical)
       ↓
4. Node.js Insights Service fetches patterns
       ↓
5. Gemini LLM converts to natural language
       ↓
6. Cached in patterns table (24hr TTL)
       ↓
7. Flutter displays friendly insights
```

## Example Flow

### Step 1: User Logs Activities
```javascript
POST /api/v1/input/text
{
  "text": "Did chest workout for 45 minutes"
}
// Repeated 4 times over 2 weeks
```

### Step 2: Python Detects Pattern
```python
# Python analytics service analyzes memory_units
{
  "pattern_type": "frequency",
  "category": "fitness",
  "activity": "chest workout",
  "frequency_per_week": 3.5,
  "confidence": 0.89,
  "description": "You chest workout 3.5x per week on average"
}
```

### Step 3: Node.js Gets Insight
```javascript
GET /api/v1/insights

// Calls Python, gets patterns
const patterns = await fetch('http://localhost:8001/api/v1/patterns/userId');

// Converts via Gemini
const insight = await llm.generate(
  "You're crushing it with chest workouts - almost 4 times a week! 💪"
);

// Caches in DB
await PatternModel.upsert({
  userId,
  category: 'fitness',
  patternType: 'frequency',
  description: insight,
  confidenceScore: 0.89
});
```

### Step 4: Flutter Shows Insight
```dart
// GET /api/v1/insights
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "frequency",
      "category": "fitness",
      "insight": "You're crushing it with chest workouts - almost 4 times a week! 💪",
      "confidence": 0.89,
      "isNew": true,
      "lastUpdated": "2026-01-14T00:50:00Z"
    }
  ],
  "count": 1,
  "cached": false
}
```

---

## Caching Strategy

### Why Cache?
- **Performance**: Avoid repeated Python analytics calls
- **Cost**: Reduce LLM API calls
- **Consistency**: Same insights throughout the day

### Cache Duration
- **24 hours**: Patterns refresh daily
- **Old patterns**: Cleaned up after 30 days

### Cache Invalidation
```javascript
// Auto-refresh after 24 hours
GET /api/v1/insights

// Force refresh
GET /api/v1/insights?refresh=true
// Or
POST /api/v1/insights/refresh
```

---

## Database Storage

### patterns Table
```sql
CREATE TABLE patterns (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    
    -- Pattern info
    category VARCHAR(100),           -- fitness, finance, etc.
    pattern_type VARCHAR(100),       -- frequency, time_preference, correlation
    description TEXT,                 -- Natural language insight from LLM
    
    -- Metadata
    confidence_score DECIMAL(3,2),
    supporting_memories UUID[],       -- Memory IDs that support this
    
    -- Lifecycle
    first_detected_at TIMESTAMPTZ,
    last_validated_at TIMESTAMPTZ,   -- Updated on refresh
    status VARCHAR(20),               -- active, dismissed, automated
    
    is_actionable BOOLEAN            -- Can generate a plan from this?
);
```

### Storage Example
```javascript
{
  id: "uuid-1",
  user_id: "user-123",
  category: "fitness",
  pattern_type: "frequency",
  description: "You're crushing it with chest workouts - almost 4 times a week! 💪",
  confidence_score: 0.89,
  supporting_memories: [],
  first_detected_at: "2026-01-13T10:00:00Z",
  last_validated_at: "2026-01-14T00:50:00Z",
  status: "active",
  is_actionable: false
}
```

---

## API Endpoints

### Get All Insights
```bash
GET /api/v1/insights

# With force refresh
GET /api/v1/insights?refresh=true
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "frequency",
      "category": "fitness",
      "insight": "You're crushing it with chest workouts - almost 4 times a week! 💪",
      "confidence": 0.89,
      "rawData": { /* Python pattern */ },
      "isNew": false,  // false = from cache
      "lastUpdated": "2026-01-14T00:00:00Z"
    }
  ],
  "count": 1,
  "cached": true
}
```

### Get Category Insights
```bash
GET /api/v1/insights/category/fitness
```

### Force Refresh
```bash
POST /api/v1/insights/refresh
```

---

## LLM Prompt for Insights

```javascript
const prompt = `
You are a personal AI assistant. Convert this statistical pattern into a friendly, encouraging insight.

Pattern Type: frequency
Category: fitness
Activity: chest workout
Data: {
  "frequency_per_week": 3.5,
  "regularity_score": 0.85,
  "confidence": 0.89
}

Generate a single short sentence (max 20 words) that:
- Sounds personal and encouraging
- Highlights the pattern naturally
- Feels like a friend noticing something about you

Examples:
- "You're crushing it with workouts - 4 times a week! That's consistency 💪"
- "Mornings are your meditation sweet spot - you nail it at 6 AM ✨"

Now generate for the given pattern.
`;
```

**LLM Output:**
```
"You're crushing it with chest workouts - almost 4 times a week! 💪"
```

---

## Benefits

### ✅ Performance
- First call: Fetches from Python + LLM (slow)
- Subsequent calls: Returns cached (fast)
- 24hr TTL keeps insights fresh

### ✅ Cost Savings
- LLM called once per pattern per day
- Python analytics only when cache expires

### ✅ Consistency
- Same insight shown throughout the day
- No "flicker" between different phrasings

### ✅ Offline Capable
- Cached patterns work without Python service
- Graceful degradation

---

## Testing

### 1. Log Some Memories
```bash
# Log 5 chest workouts over 2 weeks
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/v1/input/text \
    -H "Content-Type: application/json" \
    -d '{"text": "Did chest workout for 45 minutes"}'
  sleep 2
done
```

### 2. Get Insights
```bash
# This will:
# 1. Call Python analytics
# 2. Detect frequency pattern
# 3. Convert to natural language via Gemini
# 4. Cache in patterns table
curl http://localhost:3000/api/v1/insights
```

### 3. Verify Caching
```bash
# Second call should be instant (from cache)
curl http://localhost:3000/api/v1/insights

# Check the response - "cached": true
```

### 4. Force Refresh
```bash
# Bypass cache
curl -X POST http://localhost:3000/api/v1/insights/refresh
```

---

## Architecture

```
┌─────────────────────────────────────────────┐
│            Node.js Backend (3000)           │
├─────────────────────────────────────────────┤
│                                             │
│  GET /api/v1/insights                       │
│       ↓                                     │
│  InsightsController                         │
│       ↓                                     │
│  InsightsService                            │
│       ↓                                     │
│  ┌─────────────────────────────────┐       │
│  │ 1. Check patterns table (cache) │       │
│  │ 2. If fresh → return            │       │
│  │ 3. If stale → continue          │       │
│  └─────────────────────────────────┘       │
│       ↓                                     │
│  ┌─────────────────────────────────┐       │
│  │ 4. Fetch from Python Analytics  │───────┼──→ Python (8001)
│  └─────────────────────────────────┘       │
│       ↓                                     │
│  ┌─────────────────────────────────┐       │
│  │ 5. Convert to natural language  │───────┼──→ Gemini LLM
│  └─────────────────────────────────┘       │
│       ↓                                     │
│  ┌─────────────────────────────────┐       │
│  │ 6. Store in patterns table      │───────┼──→ PostgreSQL
│  └─────────────────────────────────┘       │
│       ↓                                     │
│  7. Return friendly insights                │
│                                             │
└─────────────────────────────────────────────┘
```

This integration is **the key differentiator** - combining statistical rigor (Python) with human-friendly communication (LLM) while maintaining performance through smart caching.
