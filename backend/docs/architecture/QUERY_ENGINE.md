# Query Engine - "Ask Anything About Your Life"

## Overview

The Query Engine enables natural language queries across all your life data using **Strategy 2: LLM Intent Extraction + Safe Query Builder**.

## How It Works

```
User asks: "How much did I spend on food this month?"
       ↓
1. Gemini extracts intent:
   - type: "aggregate"
   - category: "finance"
   - timeRange: "month"
   - metric: "amount"
   - filter: "food"
       ↓
2. Safe query builder creates parameterized SQL:
   SELECT SUM(amount) 
   FROM memory_units
   WHERE user_id = $1 AND category = $2 AND ...
       ↓
3. Execute & format result:
   "Total: ₹5,240"
```

## Supported Intent Types

### 1. Aggregate (Sum/Average/Count)
**Examples:**
- "How much did I spend on food this month?"
- "Total workout duration this week?"
- "How much did I earn in January?"

**Response:**
```json
{
  "success": true,
  "intent": "aggregate",
  "answer": "Total: ₹5,240",
  "data": { "total": 5240 }
}
```

### 2. Count Occurrences
**Examples:**
- "How many workouts this week?"
- "How many times did I meditate this month?"
- "Count my expenses today"

**Response:**
```json
{
  "success": true,
  "intent": "count",
  "answer": "Count: 12",
  "data": { "count": 12 }
}
```

### 3. Find Last (Most Recent)
**Examples:**
- "When did I last meditate?"
- "My most recent expense?"
- "Last chest workout?"

**Response:**
```json
{
  "success": true,
  "intent": "find_last",
  "answer": "Last recorded: 13 Jan 2026, 6:30 PM - 'Morning meditation session'",
  "data": { "id": "...", "raw_input": "...", "created_at": "..." }
}
```

### 4. List Items
**Examples:**
- "Show my recent expenses"
- "List my workouts this week"
- "All meditation sessions"

**Response:**
```json
{
  "success": true,
  "intent": "list",
  "answer": "Found 10 items",
  "data": [
    { "id": "...", "text": "Paid ₹500 for groceries", "date": "..." },
    ...
  ]
}
```

### 5. Timeline (Group by Time)
**Examples:**
- "My workouts per week for the last month"
- "Daily meditation count this week"
- "Weekly spending trend"

**Response:**
```json
{
  "success": true,
  "intent": "timeline",
  "answer": "4 weeks of data",
  "data": [
    { "week": "2026-01-06", "count": 3 },
    { "week": "2026-01-13", "count": 4 }
  ]
}
```

### 6. Compare Categories
**Examples:**
- "Food vs transport spending this month"
- "Compare my workout categories"
- "Top 3 spending categories"

**Response:**
```json
{
  "success": true,
  "intent": "compare",
  "answer": "Top: food (₹5,240)",
  "data": [
    { "category": "food", "total": 5240 },
    { "category": "transport", "total": 2100 }
  ]
}
```

---

## API Usage

### Endpoint
```
POST /api/v1/query
```

### Request
```json
{
  "question": "How much did I spend on food this month?"
}
```

### Response
```json
{
  "success": true,
  "question": "How much did I spend on food this month?",
  "intent": "aggregate",
  "answer": "Total: ₹5,240",
  "data": { "total": 5240 }
}
```

---

## Testing Examples

### Example 1: Spending Query
```bash
curl -X POST http://localhost:3000/api/v1/query \
  -H "Content-Type: application/json" \
  -d '{"question": "How much did I spend on food this month?"}'
```

### Example 2: Workout Count
```bash
curl -X POST http://localhost:3000/api/v1/query \
  -H "Content-Type: application/json" \
  -d '{"question": "How many workouts this week?"}'
```

### Example 3: Last Activity
```bash
curl -X POST http://localhost:3000/api/v1/query \
  -H "Content-Type: application/json" \
  -d '{"question": "When did I last meditate?"}'
```

### Example 4: List Recent
```bash
curl -X POST http://localhost:3000/api/v1/query \
  -H "Content-Type: application/json" \
  -d '{"question": "Show my recent expenses"}'
```

---

## Cross-Domain Queries

The query engine works across ALL categories:

```bash
# Finance
"How much did I spend this month?"
"Top 3 spending categories?"

# Fitness  
"How many workouts this week?"
"When did I last do chest?"

# Routine
"Have I taken my vitamin C today?"
"When did I last water plants?"

# General
"Show everything from today"
"Count all my activities this week"
```

---

## Safety Features

✅ **Parameterized Queries**: All SQL uses `$1, $2, ...` placeholders
✅ **No String Concatenation**: Prevents SQL injection
✅ **User Isolation**: Always filters by `user_id`
✅ **Validated Status Only**: Only queries validated memories
✅ **Intent-Based Building**: LLM doesn't write SQL, only extracts intent

---

## Limitations & Future Enhancements

**Current Limitations:**
- Single metric per query (can't do "sum AND count")
- Basic time ranges (today/week/month/year)
- No complex joins
- No aggregations across categories

**Coming Soon:**
- ⏳ Complex queries ("workouts vs spending correlation")
- ⏳ Custom time ranges ("last 3 months", "between dates")
- ⏳ Advanced analytics ("trend analysis", "predictions")
- ⏳ Voice queries (speak your question)

---

## Example Conversation Flow

**Flutter App:**
```
User types: "How much did I spend on food?"
       ↓
App shows typing indicator...
       ↓
Response: "Total: ₹5,240 on food this month"
+ Optional: Chart showing daily breakdown
```

---

This is the **"Ask Absurd Questions"** viral feature - users can query their life data naturally without learning query syntax!
