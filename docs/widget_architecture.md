# Memory OS - Widget-Based Voice-First Architecture

## 🎯 Core Philosophy

**Voice-First, Widget-Driven Intelligence**

Users **speak or type naturally** → AI **understands intent** → System **surfaces relevant widgets** → Widgets can be **clicked for deep-dive**

**No manual navigation. No category selection. Just natural interaction.**

---

## 📱 App Structure (Simplified)

### 3-Screen Architecture

```
┌─────────────────────────────────┐
│   1. FEED (Main)                │  ← 95% of time spent here
│   - Intelligent widget stream   │
│   - Voice/text always accessible│
│   - Auto-prioritized content    │
├─────────────────────────────────┤
│   2. INPUT (Fullscreen)         │  ← Quick log modal
│   - Voice recorder              │
│   - Text input                  │
│   - Marquee examples            │
├─────────────────────────────────┤
│   3. ME (Profile)               │  ← Settings/plans
│   - User profile                │
│   - Subscription                │
│   - Settings                    │
└─────────────────────────────────┘
```

**Bottom Nav:** Feed | Input | Me

---

## 🎨 Main Feed Design

### Layout

```
┌─────────────────────────────────────┐
│ [Widget 1 - Most Relevant]          │ ← AI prioritized
│ [Widget 2 - Recently Used]          │
│ [Widget 3 - Time-Contextual]        │
│ [Widget 4 - Trending]               │
│ [Widget 5 - AI Suggested]           │
│ ... (infinite scroll)               │
│ [Widget N]                          │
├─────────────────────────────────────┤
│ [Voice/Text Input Bar - Bottom]    │ ← Pinned bottom
└─────────────────────────────────────┘
```

### Pinned Bottom: Voice/Text Input Bar

**Always visible at bottom of screen**

**Default State (Collapsed):**
```
┌─────────────────────────────────────┐
│ [Mic Icon] [Text input...____] [→] │
└─────────────────────────────────────┘
```

**Recording State (Expanded):**
```
┌─────────────────────────────────────┐
│ ●REC 3s [████████░░░░] 6s [X] [✓]  │
│ Progress slider fills left-to-right │
└─────────────────────────────────────┘
```

**Components:**

**1. Mic Button** (left)
- Tap: Start recording
- Hold: Record while holding
- Release: Stop recording
- Color: Red when recording

**2. Text Input Field** (center)
- Tap: Expand to show keyboard
- Type: Natural language input
- Placeholder: "What did you do?" or marquee example

**3. Submit Button** (right)
- Arrow icon →
- Tap: Process input
- Disabled until text entered

**4. Recording Controls** (when recording)
- Red dot + "REC" indicator
- Timer: "3s" (current seconds)
- Progress bar slider (visual fill)
- Max duration: "6s" (configurable)
- Cancel button (X)
- Send button (✓)

**Settings:**
- Recording duration: 3s, 6s, 10s, 15s, 30s, 60s
- Auto-send on max duration (optional)
- Haptic feedback on start/stop


**Interaction:**
- Tap voice: Start recording (expands to show controls)
- Type text: Natural language input
- Tap marquee: Auto-fill example into text field

---

## 🎠 Marquee Discovery System

### Purpose
**Teach users how to log by showing real examples**

### Placement
**Just above the input bar at bottom** (scrolls with feed but always visible near input)

### Design

```
┌─────────────────────────────────────┐
│ ... (feed content above)            │
├─────────────────────────────────────┤
│ 💪 Fitness                          │ ← Marquee
│ "Went to gym for leg workout 1h"   │
├─────────────────────────────────────┤
│ [Mic] [Text input...____] [→]      │ ← Input bar
└─────────────────────────────────────┘
```

**Alternative:** Marquee as placeholder text inside input field
- Rotates every 3s
- "Try: Went to gym for leg workout 1h"
- Changes category color with rotation

### Example Inputs by Category

**Fitness:**
- "Went to gym for leg workout 1 hour"
- "Did chest workout • energy level 9"
- "Ran 5k in 28 minutes"
- "Rest day after 3 workouts"

**Finance:**
- "Spent $45.50 on groceries"
- "Got paid $2500 salary"
- "Coffee $4.50"
- "Saved $200 this month"

**Routine:**
- "Morning meditation complete"
- "Took vitamins and breakfast"
- "Evening walk done"

**Health:**
- "Slept 7.5 hours • felt refreshed"
- "Blood pressure 120/80"
- "Headache for 2 hours"
- "Took ibuprofen 200mg"

**Mindfulness:**
- "Meditated for 15 minutes"
- "Feeling calm and focused"
- "Grateful for family time"
- "Anxious about work deadline"

**Generic:**
- "Meeting with Sarah • discussed project"
- "Read 30 pages of book"
- "Called mom"

### Interaction
- **Auto-rotate**: Every 3 seconds
- **Tap**: Auto-fill input with example
- **Swipe**: Manual category navigation
- **Learn mode**: First 3 days shows more frequently

---

## 🧩 Widget Library (25 Widgets)

### Widget Categories

**1. Input Widgets (2)**
- Quick Input Widget
- Voice Recorder Widget

**2. Data Display Widgets (12)**
- Habits Checklist Widget
- Fitness Summary Widget
- Finance Summary Widget  
- Routine Timeline Widget
- Health Dashboard Widget
- Mindfulness Tracker Widget
- Recent Memories Widget
- Category Timeline Widget (generic, reusable)
- Single Metric Widget (reusable)
- Mini Chart Widget (reusable)
- Heatmap Calendar Widget (reusable)
- Progress Ring Widget (reusable)

**3. Insight Widgets (6)**
- Engagement Score Widget
- Pattern Detected Widget
- Achievement Unlocked Widget
- Streak Milestone Widget
- Gap Warning Widget
- AI Recommendation Widget

**4. Action Widgets (5)**
- Generate Plan Widget
- Create Habit Widget
- Goal Setting Widget
- Export Data Widget
- Quick Stats Widget

---

## 📋 Widget Specifications

### 1. Quick Input Widget

**Purpose:** Fast logging without modal

**Display:**
- Compact text field
- Voice button
- Recent category icons

**States:**
- idle, typing, recording, processing, success

**Click Action:** Expand to fullscreen input

---

### 2. Habits Checklist Widget

**Purpose:** Today's habit completion

**Display:**
- Date header
- Completion progress (4/6)
- List of habits with checkboxes
- Streak indicators

**States:**
- loading, loaded, updating

**Click Action:**
- Checkbox: Mark complete
- Habit name: → Habit Detail Screen
- Widget: → All Habits Screen

**Detail Screen:** All Habits
- Filter: active/paused/completed
- Search by habit name
- Sort by streak, category
- Calendar heatmap per habit
- Edit/delete actions

---

### 3. Fitness Summary Widget

**Purpose:** Recent fitness activity

**Display:**
- This week summary (workouts, duration)
- Mini bar chart
- Last workout card
- Workout frequency

**States:**
- empty (show example), loading, loaded

**Click Action:** → Fitness Detail Screen

**Detail Screen:** Fitness Explorer
- **Timeline tab**: All workouts chronologically
- **Charts tab**: Volume trends, split patterns
- **Search**: By date, workout type, muscle group
- **Filters**: Type (strength/cardio/etc), date range
- **Stats**: Total volume, frequency, records

---

### 4. Finance Summary Widget

**Purpose:** Spending overview

**Display:**
- This month: income, expenses, net
- Category breakdown (pie chart)
- Recent transactions (3-5)

**States:**
- empty, loading, loaded

**Click Action:** → Finance Detail Screen

**Detail Screen:** Finance Explorer
- **Timeline tab**: All transactions
- **Charts tab**: Spending trends, category breakdown
- **Search**: By amount, category, date
- **Filters**: Income/expense, date range, category
- **Stats**: Monthly average, top categories

---

### 5. Routine Timeline Widget

**Purpose:** Today's routine completions

**Display:**
- Timeline of completed routines
- Completion checkmarks
- Time of completion

**Click Action:** → Routine Detail Screen

**Detail Screen:** Routine History
- **Timeline**: All routine completions
- **Patterns**: Best time-of-day, consistency
- **Search**: By routine name, date
- **Stats**: Completion rate, streaks

---

### 6. Health Dashboard Widget

**Purpose:** Health metrics overview

**Display:**
- Sleep duration (last night)
- Recent vitals (if logged)
- Symptom alerts
- Medication reminders

**Click Action:** → Health Detail Screen

**Detail Screen:** Health Explorer
- **Sleep tab**: Sleep duration chart, quality trends
- **Vitals tab**: BP, HR, weight graphs
- **Symptoms tab**: Timeline, recurring patterns
- **Meds tab**: Adherence calendar, reminders
- **Search**: By metric type, date range

---

### 7. Mindfulness Tracker Widget

**Purpose:** Mental wellness summary

**Display:**
- Meditation streak
- Recent mood (emoji)
- Gratitude count this week
- Mindfulness minutes

**Click Action:** → Mindfulness Detail Screen

**Detail Screen:** Mindfulness Explorer
- **Meditation tab**: Session history, total minutes
- **Mood tab**: Mood timeline, patterns
- **Gratitude tab**: Journal entries
- **Stats**: Streak, average session length

---

### 8. Recent Memories Widget

**Purpose:** Latest logged entries (all categories)

**Display:**
- Last 5-7 memories
- Category icons
- Timestamps
- Quick swipe actions

**Click Action:**
- Memory card: → Memory Detail
- Widget: → All Memories Screen

**Detail Screen:** Memory Explorer
- **Timeline**: All memories
- **Search**: Full-text search
- **Filters**: Category, date, has-metrics
- **Sort**: Newest, oldest, category

---

### 9. Engagement Score Widget

**Purpose:** Overall consistency metric

**Display:**
- Large engagement ring (0-100)
- Score components breakdown
- Trend indicator (up/down/stable)

**Click Action:** → Engagement Detail Screen

**Detail Screen:** Engagement Analytics
- Score trend (30 days)
- Component breakdown (recency, frequency, streak, growth)
- Category scores
- Recommendations to improve

---

### 10. Pattern Detected Widget

**Purpose:** AI-discovered insights

**Display:**
- Pattern headline
- Example instances
- Confidence level
- CTA: "Create habit from this"

**Click Action:** → Pattern Detail Screen

**Detail Screen:** All Patterns
- List of detected patterns
- Filter by category
- Pattern examples timeline
- Create habit/plan from pattern

---

### 11. Achievement Unlocked Widget

**Purpose:** Milestone celebrations

**Display:**
- Badge icon
- Achievement name
- Confetti animation
- Share button

**States:**
- appearing (animated), displayed, dismissed

**Click Action:** → Achievements Screen

**Detail Screen:** All Achievements
- Earned badges
- In-progress badges
- Locked badges
- Total points

---

### 12. Streak Milestone Widget

**Purpose:** Current streak celebration

**Display:**
- Flame icon (animated)
- Days count
- Encouragement message
- Next milestone

**Click Action:** → Streak Calendar

**Detail Screen:** Streak History
- Calendar heatmap
- Longest streak record
- Streak by category
- Motivation tips

---

### 13. Gap Warning Widget

**Purpose:** Alert for missed activity

**Display:**
- Warning icon
- "3 days since last ..." message
- Quick log button
- Dismiss action

**Click Action:** → Gap Analysis Screen

**Detail Screen:** Gap Analysis
- All detected gaps
- Severity (low/medium/high)
- Category breakdown
- Re-engagement suggestions

---

### 14. AI Recommendation Widget

**Purpose:** Personalized suggestions

**Display:**
- Recommendation text
- Reasoning ("Based on your patterns...")
- Accept/Dismiss CTAs

**Types:**
- "Try meditation before bed" (based on sleep patterns)
- "Set a workout reminder for 7am" (time-based)
- "Track your coffee spending" (pattern-detected)

**Click Action:** Execute recommendation or dismiss

---

### 15. Generate Plan Widget

**Purpose:** Create behavior change plan

**Display:**
- "Want to improve [category]?"
- Template suggestions
- Generate button

**Click Action:** → Plan Generator Screen

**Detail Screen:** Plan Generator
- Category selection
- Goal templates
- Customization
- Generate AI plan
- View generated plan

---

### 16-20. Category Timeline Widgets (Reusable)

**Generic template, customized per category**

**Display:**
- Category icon + name
- Recent entries (3-5)
- Mini metric summary
- "View all" CTA

**Click Action:** → Category Detail Screen (already described above)

---

### 21-25. Utility Widgets

**Single Metric Widget:**
- Display one value (count, duration, amount)
- Trend arrow
- Label
- Reusable across categories

**Mini Chart Widget:**
- Small trend chart (line/bar)
- Time range
- Category color
- Reusable

**Heatmap Calendar Widget:**
- Activity density calendar
- Clickable days
- Reusable

**Progress Ring Widget:**
- Circular progress (0-100)
- Label
- Tap for detail
- Reusable

**Quick Stats Widget:**
- Grid of 4 stats
- Icons + values
- Tap to explore
- Reusable

---

## 🗣️ Voice/Text Processing Pipeline

### Flow Diagram

```
User Input (Voice/Text)
    ↓
1. Transcription (if voice)
    ↓
2. LLM Enhancement
   - Fill in context
   - Fix grammar/syntax
   - Make syntactically complete
    ↓
3. Confidence Scoring
    ↓
4a. High Confidence (>80%)     4b. Low Confidence (<80%)
    → Auto-process                  → Show confirmation overlay
    → Create memory                 → User reviews
                                    → Approve/Edit/Reject
```

### Step 1: Voice Transcription

**Input:** Audio recording (3-60 seconds)  
**Output:** Raw text transcription

**Service:** Speech-to-Text API (Google Cloud, Whisper, etc.)

**Example:**
```
Audio: "went gym leg workout hour"
Raw Transcription: "went gym leg workout hour"
```

---

### Step 2: LLM Enhancement

**Purpose:** Transform incomplete/casual speech into complete, syntactically correct sentences

**LLM Prompt:**
```
Enhance this user input to be syntactically complete and natural:
- Fill in missing words (articles, prepositions)
- Fix grammar
- Maintain original meaning
- Keep it concise
- Don't add information not implied

Input: "{raw_text}"

Respond with JSON:
{
  "enhanced_text": "...",
  "confidence": 0.0-1.0,
  "detected_category": "fitness|finance|health|...",
  "detected_entities": {
    "duration": "...",
    "amount": "...",
    etc.
  }
}
```

**Examples:**

**Example 1 (High Confidence):**
```
Raw:      "went gym leg workout hour"
Enhanced: "Went to gym for leg workout for 1 hour"
Confidence: 0.95
Category: fitness
Entities: {duration: 60, workout_type: "legs"}
```

**Example 2 (Medium Confidence):**
```
Raw:      "spent forty groceries"
Enhanced: "Spent $40 on groceries"
Confidence: 0.72
Category: finance
Entities: {amount: 40, category: "groceries"}
```

**Example 3 (Low Confidence):**
```
Raw:      "did thing morning"
Enhanced: "Did something this morning"
Confidence: 0.45
Category: generic
Entities: {}
Reason: Too vague, multiple interpretations
```

---

### Step 3: Confidence Scoring

**Factors (0.0 - 1.0):**

**Speech Clarity (30%):**
- Clear audio = 1.0
- Some noise = 0.7
- Very noisy = 0.3

**Semantic Completeness (40%):**
- Complete sentence = 1.0
- Missing 1-2 words = 0.7
- Very fragmented = 0.3

**Entity Extraction (20%):**
- All key entities found = 1.0
- Some entities found = 0.6
- No entities = 0.2

**Category Confidence (10%):**
- Clear category match = 1.0
- Ambiguous = 0.5
- Unclear = 0.2

**Threshold:**
- **≥ 0.80**: Auto-process (high confidence)
- **0.50 - 0.79**: Show with edit option (medium)
- **< 0.50**: Require confirmation (low)

---

### Step 4a: High Confidence Flow

**When:** Confidence ≥ 0.80

**Action:** Auto-process without confirmation

**UI Feedback:**
```
┌─────────────────────────────────┐
│ ✓ Logged!                       │
│ "Went to gym for leg workout    │
│  for 1 hour"                    │
│                                 │
│ [Undo] [View]                   │
└─────────────────────────────────┘
```

**Duration:** 3 seconds, then dismiss  
**Options:**
- Undo: Delete memory
- View: Open memory detail
- Auto-dismiss after 3s

---

### Step 4b: Low/Medium Confidence Flow

**When:** Confidence < 0.80

**Action:** Show confirmation overlay

**Confirmation Overlay UI:**

```
┌─────────────────────────────────────┐
│ 📝 Is this correct?                 │
├─────────────────────────────────────┤
│                                     │
│ You said:                           │
│ "spent forty groceries"             │
│                                     │
│ We understood:                      │
│ ┌─────────────────────────────────┐ │
│ │ Spent $40 on groceries          │ │ ← Editable
│ └─────────────────────────────────┘ │
│                                     │
│ Category: 💵 Finance                │
│ Confidence: 72%                     │
│                                     │
│ [✏️ Edit] [✓ Confirm] [✗ Cancel]   │
└─────────────────────────────────────┘
```

**User Actions:**

**1. Confirm** (✓)
- Accept enhanced text
- Create memory
- Show success toast

**2. Edit** (✏️)
- Expand text field
- User edits enhanced text
- Category re-detected
- Confirm to save

**3. Cancel** (✗)
- Discard input
- Return to input bar
- Original text remains in field

---

### Step 5: Memory Creation

**After confirmation (or auto-process):**

**API Call:**
```
POST /api/v1/input/process
{
  "raw_input": "went gym leg workout hour",
  "enhanced_text": "Went to gym for leg workout for 1 hour",
  "source": "voice",
  "confidence_score": 0.95
}
```

**Response:**
```json
{
  "success": true,
  "memory": {
    "id": "uuid",
    "category": "fitness",
    "normalized_data": {
      "activity": "leg workout",
      "duration_minutes": 60,
      "location": "gym"
    }
  }
}
```

**UI Update:**
- Success toast
- Widget feed refreshes
- Relevant widgets rise (fitness summary)
- Continue to next input

---

## 🎨 Confirmation Overlay Design

### Visual Specs

**Overlay Background:**
```
Light Mode: rgba(0,0,0,0.4) backdrop blur
Dark Mode:  rgba(0,0,0,0.6) backdrop blur
```

**Card:**
```
Light Mode:
  Background: #FFFFFF
  Shadow: 0 8px 32px rgba(0,0,0,0.16)
  Radius: 16px
  
Dark Mode:
  Background: #2D2D2D
  Border: 1px solid #4A4A4A
  Shadow: 0 8px 32px rgba(0,0,0,0.50)
  Radius: 16px
```

**Enhanced Text Field:**
```
Background: #F8F9FA (light) / #3A3A3A (dark)
Border: 2px solid #1ABC9C (editable state)
Radius: 8px
Padding: 12px
Font: 16px Regular
```

**Confidence Indicator:**
```
High (≥80%):   Green badge
Medium (50-79%): Orange badge
Low (<50%):    Red badge
```

**Animation:**
- Slide up from bottom (300ms ease-out)
- Backdrop blur in (200ms)
- Dismiss: Slide down + fade (200ms)

---

## 🔄 Edge Cases & Error Handling

### 1. Network Error (During LLM Call)

**Fallback:**
- Use raw transcription
- Show warning: "Processed offline"
- Retry enhancement in background

**UI:**
```
⚠️ Limited connectivity
Using: "went gym leg workout hour"
[Edit] [Send Anyway]
```

---

### 2. Ambiguous Input

**Example:** "did twenty"
- 20 minutes? 20 reps? $20?

**LLM Response:**
```json
{
  "enhanced_text": "Did something for 20 [minutes/reps/dollars]",
  "confidence": 0.35,
  "ambiguity": "duration vs count vs amount",
  "suggestions": [
    "Worked out for 20 minutes",
    "Did 20 reps",
    "Spent $20"
  ]
}
```

**UI: Multiple Choice**
```
┌─────────────────────────────────┐
│ What did you mean?              │
│                                 │
│ ○ Worked out for 20 minutes     │
│ ○ Did 20 reps                   │
│ ○ Spent $20                     │
│ ○ Let me rephrase...            │
└─────────────────────────────────┘
```

---

### 3. Very Low Confidence (<30%)

**Action:** Prompt user to rephrase

**UI:**
```
┌─────────────────────────────────┐
│ 🤔 We didn't catch that         │
│                                 │
│ Could you try again?            │
│ Or type it out instead.         │
│                                 │
│ [🎤 Try Again] [⌨️ Type]        │
└─────────────────────────────────┘
```

---

### 4. Background Noise

**Detection:** High background noise in audio

**Action:** Warn user before transcription

**UI (During Recording):**
```
┌─────────────────────────────────┐
│ 🔊 High background noise        │
│ Move to quieter location?       │
│                                 │
│ [Continue Anyway] [Stop]        │
└─────────────────────────────────┘
```

---

## ⚙️ Settings & Customization

**User Preferences:**

**1. Confirmation Threshold**
```
○ Always confirm (show overlay every time)
○ Smart confirm (default: <80%)
● Auto-process high confidence (≥80%)
○ Never confirm (always auto-process)
```

**2. Enhancement Level**
```
● Full enhancement (complete sentences)
○ Minimal enhancement (just fix grammar)
○ No enhancement (raw transcription only)
```

**3. Voice Feedback**
```
☑ Haptic feedback on start/stop
☑ Sound effects
☑ Read back enhanced text (TTS)
```

**4. Privacy**
```
☑ Process voice locally when possible
☑ Don't store raw audio
□ Use cloud for better accuracy
```

---

## 🧪 Example Scenarios

### Scenario 1: Perfect Recognition
```
User: "I went to the gym for a leg workout for one hour"
Raw: "went to the gym for a leg workout for one hour"
Enhanced: "Went to the gym for a leg workout for 1 hour"
Confidence: 0.98
Action: ✅ Auto-process
Result: Memory created immediately
```

### Scenario 2: Needs Enhancement
```
User: "gym legs hour"
Raw: "gym legs hour"
Enhanced: "Went to gym for leg workout for 1 hour"
Confidence: 0.75
Action: ⚠️ Show confirmation
User: Reviews, confirms
Result: Memory created after approval
```

### Scenario 3: Ambiguous Amount
```
User: "spent forty five coffee"
Raw: "spent forty five coffee"
Enhanced: "Spent $45 on coffee"
Confidence: 0.68
Action: ⚠️ Show confirmation
Question: "$45 or $4.50?"
User: Edits to "$4.50"
Result: Corrected memory created
```

### Scenario 4: Too Vague
```
User: "did stuff"
Raw: "did stuff"
Enhanced: "Did something"
Confidence: 0.25
Action: ❌ Ask to rephrase
User: Tries again or types instead
```

---

## 📊 Success Metrics

**Track:**
- Average confidence score
- Confirmation rate
- Edit rate
- Cancel rate
- User satisfaction

**Goal:**
- 70%+ auto-processed (high confidence)
- <10% cancel rate
- <20% edit rate

---

## 🔧 Technical Implementation

### Frontend State Machine

```dart
enum InputState {
  idle,
  recording,
  transcribing,
  enhancing,
  confirming,
  processing,
  success,
  error
}
```

### Processing Function

```dart
Future<void> processVoiceInput(AudioFile audio) async {
  setState(InputState.transcribing);
  
  // 1. Transcribe
  String rawText = await speechToText(audio);
  
  setState(InputState.enhancing);
  
  // 2. Enhance with LLM
  EnhancementResult result = await llmEnhance(rawText);
  
  // 3. Check confidence
  if (result.confidence >= 0.80) {
    // Auto-process
    setState(InputState.processing);
    await createMemory(result.enhancedText);
    setState(InputState.success);
  } else {
    // Show confirmation
    setState(InputState.confirming);
    bool approved = await showConfirmationOverlay(result);
    
    if (approved) {
      setState(InputState.processing);
      await createMemory(result.enhancedText);
      setState(InputState.success);
    } else {
      setState(InputState.idle);
    }
  }
}
```

---

**This creates a smart, forgiving voice input system that feels magical! 🎙️✨**

Users can speak naturally, LLM makes it perfect, and low-confidence cases get confirmed - best of both worlds.

---

## 🗣️ Voice/Text Command System

### Command Patterns

**Logging (Primary):**
- "Went to gym"
- "Spent $50"
- "Meditated 10 minutes"
- "Slept 8 hours"

**Querying:**
- "Show my habits"
- "How much did I spend this month?"
- "What's my fitness trend?"
- "Show sleep pattern"

**Actions:**
- "Create a workout plan"
- "Mark meditation done"
- "Generate finance insights"

**Navigation:**
- "Show all workouts"
- "Open fitness details"
- "View habit calendar"

### AI Processing

**Intent Detection:**
1. Log → Extract entities → Create memory
2. Query → Identify widget → Surface to top
3. Action → Execute command → Show result
4. Navigation → Load detail screen → Jump to view

**Response:**
- Log: "Logged! 💪"
- Query: Widget appears at top
- Action: Confirmation + result
- Navigation: Screen transition

---

## 🧠 Widget Priority Algorithm

### Factors (weighted)

**1. Time Context (30%)**
- Morning (7-10am): Habits, Routine
- Midday (10am-4pm): Recent memories, Quick input
- Evening (4-9pm): Insights, Analytics
- Night (9pm+): Sleep, Reflection

**2. Usage Pattern (25%)**
- Frequently viewed widgets stay higher
- Recently clicked widgets rise
- Dismissed widgets sink

**3. Freshness (20%)**
- Widgets with new data rise
- Stale widgets sink
- Real-time updates prioritized

**4. AI Relevance (15%)**
- Related to recent activity
- Pattern-based suggestions
- Predictive surfacing

**5. User Engagement (10%)**
- High-interaction widgets rise
- Low-engagement widgets sink

### Example Priority Calculation

**Morning (8am):**
1. Habits Checklist (time + high interaction)
2. Quick Input (always high)
3. Recent Memories (freshness)
4. Fitness Summary (AI: predicts gym time)
5. Engagement Score (usage pattern)

**Evening (7pm):**
1. Quick Input (always high)
2. Insights/Patterns (time context)
3. Achievements (if earned today)
4. Habits Checklist (completion check)
5. Finance Summary (AI: expense tracking time)

### Manual Override
- Voice command: Surfaces specific widget immediately
- Click widget: Pins to top temporarily (30 min)
- Dismiss: Removes from feed until next relevant time

---

## 🔄 Navigation Flows

### Feed →Detail Screen Flow

**Scenario:** User clicks Fitness Summary Widget

```
Feed Screen
  ↓ (tap Fitness Summary Widget)
Detail Screen: Fitness Explorer
  - Timeline tab
  - Charts tab
  - Search bar
  - Filters
  ↓ (tap workout)
Memory Detail Screen
  - Full workout info
  - Edit/delete
  - Related workouts
```

**Back Navigation:**
- Memory Detail → Fitness Explorer → Feed
- Each level in nav stack
- Swipe back gesture

### Voice → Widget → Detail Flow

**Scenario:** User says "Show my workouts this week"

```
Feed Screen
  ↓ (voice: "Show my workouts this week")
Widget Appears: Fitness Summary (filtered to this week)
  ↓ (tap widget)
Detail Screen: Fitness Explorer (pre-filtered to this week)
```

---

## 📱 Screen Inventory (Reduced from 46 to 15)

### Core Screens (3)
1. Feed (main)
2. Fullscreen Input Modal
3. Profile/Settings

### Detail Screens (12)
4. All Habits Screen
5. Habit Detail Screen
6. Fitness Explorer
7. Finance Explorer
8. Routine History
9. Health Explorer
10. Mindfulness Explorer
11. Memory Explorer
12. Engagement Analytics
13. All Patterns Screen
14. Achievements Screen
15. Gap Analysis Screen
16. Plan Generator Screen

*(Other features accessible via widgets, not separate screens)*

---

## 🎯 Discoverability Strategy

### 1. Marquee Examples (Primary)
- Rotating carousel in input area
- Shows real example inputs
- Category-organized
- Tap to auto-fill

### 2. Empty State Hints
- First-time widgets show "Try saying..."
- Example commands
- Visual guides

### 3. Contextual Suggestions
- "You can also ask..." below widgets
- Related commands
- Based on current view

### 4. Onboarding (One-time)
- 3-slide intro to voice-first concept
- Interactive tutorial
- Example conversation

### 5. Help Widget
- Always accessible in feed
- "What can I do?"
- Command cheat sheet

---

## 🚀 Technical Architecture

### State Management
```dart
{
  feed: {
    widgets: List<Widget>,
    priorities: Map<String, double>,
    lastUpdate: DateTime
  },
  voice: {
    isRecording: bool,
    transcription: String,
    processing: bool
  },
  widgetStates: Map<String, WidgetState>,
  userContext: {
    timeOfDay: String,
    recentActivity: List<Activity>,
    preferences: UserPreferences
  }
}
```

### Widget Interface
```dart
abstract class FeedWidget {
  String id;
  String type;
  double priority;
  DateTime lastUpdated;
  
  Widget build();
  void onClick();
  Future<void> refresh();
  Map<String, dynamic> getState();
}
```

### Priority Engine
```dart
class WidgetPriorityEngine {
  double calculate(Widget widget, UserContext context) {
    return (
      timeScore(widget, context.timeOfDay) * 0.30 +
      usageScore(widget, context.usage) * 0.25 +
      freshnessScore(widget) * 0.20 +
      aiRelevanceScore(widget, context) * 0.15 +
      engagementScore(widget) * 0.10
    );
  }
}
```

---

## 📊 Advantages Summary

**vs Traditional 46-Screen App:**

| Aspect | Traditional | Widget-Based |
|--------|------------|--------------|
| Screens | 46 | 15 |
| Navigation | 5-tab + menus | 3-tab minimal |
| Primary Input | Tap | Voice/Text |
| Discovery | Exploration | Examples + AI |
| Cognitive Load | High (where to go?) | Low (just ask) |
| Development | Complex nav | Simple feed + widgets |
| Scalability | Add screens | Add widgets |
| UX Paradigm | Touch-first | Voice-first |

---

## ✅ Implementation Phases

**Phase 1: Core Feed**
- Feed screen with widget stack
- Voice/text input
- 5-6 essential widgets
- Basic priority algorithm

**Phase 2: All Widgets**
- 25 widget types
- Detail screens
- Advanced priority
- Marquee discovery

**Phase 3: Intelligence**
- AI pattern detection
- Predictive surfacing
- Personalization
- Advanced commands

**Phase 4: Polish**
- Animations
- Offline support
- Optimization
- Voice improvements

---

**This is the future of life tracking!** 🎙️✨

Users talk naturally, AI understands, widgets appear. Simple, intelligent, voice-first.
