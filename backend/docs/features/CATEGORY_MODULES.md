# Category Module System

## Overview

The category module system provides domain-specific processing and intelligence for each life category. Each module can customize how memories are processed, generate category-specific insights, create plans, and run guided sessions.

## Architecture

```
Memory Created
     ↓
ModuleRegistry.processMemory(memory)
     ↓
Get module by category → Falls back to GenericModule if not found
     ↓
Module.processMemory(memory)
     ↓
Category-specific logic (e.g., interval detection, tracking, etc.)
     ↓
Return processing result
```

---

## Base CategoryModule Interface

All modules extend this base class:

```javascript
class CategoryModule {
  async processMemory(memoryUnit)
  async generateInsights(userId, timeRange)
  async generatePlan(userId, planType, context)
  async updatePlanProgress(planId, memoryUnit)
  async startSession(userId, sessionType, config)
  async completeSession(sessionId, feedback)
  canHandle(normalizedData)
  getMetadata()
}
```

---

## Registered Modules

### 1. Generic Module (Fallback)
**Category:** `generic`

**Purpose:** Default handler for uncategorized memories

**Features:**
- Simple storage, no processing
- No insights
- Falls back when no specific module exists

---

### 2. Routine Module ⭐
**Category:** `routine`

**Purpose:** Track recurring maintenance tasks

**Features:**
- ✅ Interval detection (detects patterns after 3+ occurrences)
- ✅ Smart reminders (schedules based on user's actual habits)
- ✅ Overdue tracking
- ⏳ Adherence metrics (TODO)
- ⏳ Streak detection (TODO)

**How it Works:**

```javascript
// User logs: "Took vitamin C"
POST /api/v1/input/text { "text": "Took vitamin C" }
     ↓
Memory created with category: "routine"
     ↓
RoutineModule.processMemory()
     ↓
1. Check if recurring (3+ occurrences)
2. Calculate average interval (e.g., every 1 day)
3. Schedule reminder for next occurrence
4. Cancel old reminders
     ↓
Result: {
  processed: true,
  recurring: true,
  interval: 1,
  message: "Routine detected: every 1 day"
}
     ↓
Reminder created for tomorrow
```

**Supported Activities:**
- Medicine/supplements
- Plant care (watering, fertilizing)
- Cleaning/maintenance
- Vehicle service
- Any recurring task

**Example Flow:**

```bash
# Day 1: Log vitamin C
curl -X POST http://localhost:3000/api/v1/input/text \
  -d '{"text": "Took vitamin C"}'
# → Stored, not recurring yet

# Day 2: Log again
curl -X POST http://localhost:3000/api/v1/input/text \
  -d '{"text": "Took vitamin C"}'
# → Stored, not recurring yet (need 3+)

# Day 3: Log again
curl -X POST http://localhost:3000/api/v1/input/text \
  -d '{"text": "Took vitamin C"}'
# → Detected! Every ~1 day
# → Reminder scheduled for tomorrow
```

---

## Module Registry

The `ModuleRegistry` manages all modules and routes memories to the correct one:

```javascript
import moduleRegistry from './modules/base/ModuleRegistry.js';

// Get module by category
const module = moduleRegistry.get('routine');

// Process memory
const result = await moduleRegistry.processMemory(memoryUnit);

// Get all modules
const modules = moduleRegistry.getAll();

// Check if category is supported
const hasModule = moduleRegistry.hasModule('routine');
```

**Auto-registration:**
On startup:
```
📦 Registered modules: ['generic', 'routine']
  ✓ Registered: Generic (generic)
  ✓ Registered: Routine & Maintenance (routine)
```

---

## API Endpoints

### List All Modules
```bash
GET /api/v1/modules
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "category": "generic",
      "name": "Generic",
      "version": "1.0.0",
      "capabilities": {
        "processMemory": true,
        "generateInsights": false,
        "generatePlans": false,
        "guidedSessions": false
      }
    },
    {
      "category": "routine",
      "name": "Routine & Maintenance",
      "version": "1.0.0",
      "capabilities": {
        "processMemory": true,
        "generateInsights": true,
        "generatePlans": false,
        "guidedSessions": false,
        "intervalTracking": true,
        "smartReminders": true
      },
      "supportedActivities": [
        "medicine", "supplement", "vitamin",
        "water plants", "fertilize", "plant care",
        "clean", "maintenance", "service"
      ]
    }
  ],
  "count": 2
}
```

### Get Specific Module
```bash
GET /api/v1/modules/routine
```

---

## Integration with Memory Service

When a memory is created:

```javascript
// 1. Memory stored in database
const memory = await MemoryModel.create({...});

// 2. Module processes it
const moduleResult = await moduleRegistry.processMemory(memory);

// 3. Result logged
console.log('Module processing:', moduleResult);
// → {
//     processed: true,
//     recurring: true,
//     interval: 1,
//     message: "Routine detected: every 1 day",
//     module: "routine"
//   }
```

---

## Reddit Use Case: Routine Module

**Problem:** User wants to track:
- Taking medicines
- Watering plants
- Car maintenance
- Cleaning schedules

**Solution:** Routine module with interval detection

**Flow:**
```
1. User logs: "Watered plants"
2. Logs again after 3 days
3. Logs again after 3 days
   → Module detects: "Every 3 days"
   → Schedules reminder for 3 days from now

4. If user misses → Notification shows overdue
5. When logged → Reschedules based on actual behavior
```

**Smart Features:**
- Adapts to user's actual timing (not rigid schedules)
- Cancels old reminders when new  pattern detected
- Tracks overdue tasks
- No manual schedule setup needed

---

## Future Modules

### Fitness Module
- Workout tracking
- Plan templates (PPL, Upper/Lower, etc.)
- Rest day detection
- Progressive overload tracking

### Finance Module
- Double-entry ledger
- Balance verification
- Transaction categorization
- Budget tracking

### Mindfulness Module
- Guided sessions (meditation, yoga, breathing)
- Session controllers
- Progress tracking
- Habit streaks

### Health Module
- Symptom tracking
- Cross-domain correlations (sleep/mood/exercise)
- Health metric tracking

---

## Adding a New Module

```javascript
// 1. Create module file
// src/modules/fitness/fitness.module.js

import CategoryModule from '../base/CategoryModule.js';

class FitnessModule extends CategoryModule {
  constructor() {
    super({
      category: 'fitness',
      name: 'Fitness',
      version: '1.0.0'
    });
  }

  async processMemory(memoryUnit) {
    // Custom processing logic
    return { processed: true };
  }

  async generateInsights(userId, timeRange) {
    // Generate fitness insights
    return [];
  }
}

export default FitnessModule;

// 2. Register in ModuleRegistry.js
import FitnessModule from '../fitness/fitness.module.js';

registerDefaults() {
  this.register(new GenericModule());
  this.register(new RoutineModule());
  this.register(new FitnessModule()); // ← Add here
}
```

---

## Summary

✅ **Base system complete:**
- CategoryModule interface
- ModuleRegistry
- Generic fallback
- Routine module (Reddit use case)

✅ **Features:**
- Auto-routing by category
- Interval detection
- Smart reminders
- Overdue tracking

⏳ **Coming next:**
- Fitness module
- Finance module
- Mindfulness module
- Plan generation
- Guided sessions

This modular system allows each life category to have specialized logic while maintaining a consistent interface!
