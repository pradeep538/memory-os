# Fitness Module - Documentation

## Overview

The Fitness Module handles all fitness and workout-related memories, providing intelligent tracking, pattern detection, and insights.

## Features

### ✅ 1. Workout Type Detection
Automatically categorizes workouts into:
- **Strength**: Bench press, squats, deadlifts, weight lifting
- **Cardio**: Running, cycling, swimming, rowing
- **Flexibility**: Yoga, stretching, Pilates
- **Sports**: Basketball, tennis, boxing, etc.
- **General**: Other fitness activities

**How it works:**
```javascript
Input: "Did chest workout for 45 minutes"
→ Detected as: "strength" workout
```

### ✅ 2. Workout Frequency Tracking
Tracks workouts over the last 30 days and calculates:
- Total workouts this month
- Average workouts per week
- Consistency patterns

**Example:**
```
12 workouts in last 30 days
→ 2.8 workouts per week average
```

### ✅ 3. Rest Day Detection
Identifies when  you've taken rest days between workouts:
- Tracks days since last workout
- Flags rest periods (2+ days)
- Helps prevent overtraining

**Example:**
```
Last workout: 3 days ago
→ "Had 3 rest days" flagged
```

### ✅ 4. Workout Split Detection
Automatically detects your workout routine pattern:

**Supported Splits:**
- **PPL (Push/Pull/Legs)**: Chest/Shoulders/Triceps → Back/Biceps → Legs
- **Upper/Lower**: Upper body → Lower body alternating
- **Full Body**: Mixed muscle groups each session
- **Bro Split**: One muscle group per day

**How it works:**
```
Last 10 workouts:
chest → back → legs → chest → back → legs
→ Detected: "PPL" with 0.85 confidence
```

### ✅ 5. Frequency Insights
Generates motivational insights based on your consistency:

**Examples:**
- 4+ workouts/week: "Workout Warrior! Elite consistency 💪"
- 2-3 workouts/week: "Solid routine - building the habit!"
- < 2 workouts/week: (No insight, avoiding negativity)

## Usage Examples

### Example 1: Leg Day
```bash
curl -X POST http://localhost:3000/api/v1/input/text \
  -d '{"text": "Did leg day - squats and deadlifts"}'
```

**Processing Result:**
```json
{
  "processed": true,
  "workoutType": "strength",
  "workoutsThisMonth": 12,
  "averagePerWeek": 2.8,
  "message": "Tracked strength workout"
}
```

### Example 2: Cardio Session
```bash
curl -X POST http://localhost:3000/api/v1/input/text \
  -d '{"text": "Went for a 5k run"}'
```

**Processing Result:**
```json
{
  "processed": true,
  "workoutType": "cardio",
  "workoutsThisMonth": 13,
  "averagePerWeek": 3.0,
  "hadRestDay": true,
  "restDays": 2,
  "message": "Tracked cardio workout"
}
```

### Example 3: PPL Pattern
After logging 6+ workouts in PPL pattern:

```json
{
  "processed": true,
  "workoutType": "strength",
  "detectedSplit": "PPL (Push/Pull/Legs)",
  "splitConfidence": 0.85,
  "message": "Tracked strength workout"
}
```

## Integration with Insights

The Fitness Module generates insights that appear in your weekly insight notifications:

```javascript
// GET /api/v1/insights

{
  "insights": [
    {
      "type": "achievement",
      "category": "fitness",
      "title": "Workout Warrior",
      "description": "You're hitting 4.2 workouts per week! That's elite consistency 💪"
    }
  ]
}
```

## Supported Activities

The module recognizes various fitness activities:

**Strength Training:**
- Chest, bench press, push-ups
- Back, rows, pull-ups
- Legs, squats, deadlifts
- Shoulders, overhead press
- Arms, bicep curls, tricep extensions

**Cardio:**
- Running, jogging
- Cycling, biking
- Swimming
- Rowing
- Treadmill, elliptical

**Flexibility:**
- Yoga
- Stretching
- Pilates

**Sports:**
- Basketball, football, soccer
- Tennis, badminton
- Boxing, MMA
- Any team/individual sports

## Future Enhancements

### Coming Soon:
- ⏳ Progressive overload tracking (increasing weight/reps)
- ⏳ Volume tracking (total sets × reps × weight)
- ⏳ Personal records (PRs)
- ⏳ Workout plan templates
- ⏳ Deload week detection
- ⏳ Injury risk assessment (overtraining alerts)

### Planned Features:
- Plan generation (auto-create workout plans)
- Exercise library
- Form tracking via video
- Gym buddy correlation
- Supplement stack recommendations

## Testing

### Test Workout Splits

**Test PPL Pattern:**
```bash
# Push
curl -X POST http://localhost:3000/api/v1/input/text -d '{"text": "Chest and triceps workout"}'

# Pull
curl -X POST http://localhost:3000/api/v1/input/text -d '{"text": "Back and biceps workout"}'

# Legs
curl -X POST http://localhost:3000/api/v1/input/text -d '{"text": "Leg day - squats and deadlifts"}'

# Repeat 2 more times
# After 6+ workouts, pattern will be detected
```

**Check Module Status:**
```bash
curl http://localhost:3000/api/v1/modules/fitness
```

## Reddit Use Case

**Problem:** Users want to track workouts without manual spreadsheets

**Solution:** Just log "Did chest workout" via voice/text
- Auto-categorizes workout type
- Tracks frequency
- Detects your routine pattern
- Reminds you if you're slacking
- Celebrates consistency

**No setup required** - the module learns your patterns automatically!

---

This module demonstrates the power of the category module system: **domain-specific intelligence without manual configuration**.
