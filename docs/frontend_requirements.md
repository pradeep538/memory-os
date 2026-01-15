# Memory OS - Flutter Frontend Functional Requirements

## 🎯 App Vision

**Memory OS Mobile App** - An intelligent life tracker that transforms daily logging into actionable insights, personalized plans, and sustainable behavior change across 6 life domains.

### Core Value Proposition

**Voice-First, Zero-Friction Input**
- **Just talk or type** - No manual category selection required
- **AI understands context** - Automatically categorizes against the right domain
- **Voice is primary, text is secondary** - Optimized for speaking naturally

**Intelligence at Core**
- **Auto-categorization**: AI detects whether it's fitness, finance, health, routine, mindfulness, or generic
- **Pattern detection**: Discovers habits and correlations automatically
- **Engagement scoring**: Tracks consistency without manual effort

**Actionable Output**
- **Personalized plans**: AI-generated behavior change programs
- **Habit tracking**: Automated streak and progress monitoring
- **Progress visualization**: Clear insights into your life patterns

**Universal Application**: Works across fitness, finance, routine, health, mindfulness, and any life activity

---

## 📱 Navigation Pattern

### Bottom Navigation (5 Tabs)

**Functional Requirements:**

**1. Home Tab**
- **Function**: Quick access to today's summary and input
- **Default State**: Active on app launch
- **Badge Logic**: Show count of pending habits for today
- **Tap Behavior**: Returns to top if already on Home

**2. Track Tab**
- **Function**: Browse all memories with category filters
- **Badge Logic**: None
- **Tap Behavior**: Opens track overview or category view if previously filtered
- **Long Press**: Quick category selector

**3. Habits Tab**
- **Function**: View and complete today's habits
- **Badge Logic**: Number of uncompleted habits today
- **Tap Behavior**: Opens habits dashboard
- **Shake Gesture**: Mark all as complete (with confirmation)

**4. Insights Tab**
- **Function**: View analytics and patterns
- **Badge Logic**: Show "!" if new insights available
- **Tap Behavior**: Opens insights dashboard
- **Pull to Refresh**: Re-calculate scores

**5. Profile Tab**
- **Function**: Settings, plans, account management
- **Badge Logic**: "!" for pending plan updates or subscription changes
- **Tap Behavior**: Opens profile overview

**Navigation Behavior:**
- **Persistence**: Remember last viewed screen per tab
- **Transition**: Fade animation (200ms)
- **Safe Areas**: Respect iOS notch/Android cutouts
- **Offline**: All tabs accessible, show sync indicator

---

## 🧩 Generic Widget Library - Functional Specs

### Input Widgets

#### 1. UniversalInputField
**Function**: Accept text or voice input for memory creation

**Props:**
- `placeholder: String` - Hint text
- `voiceEnabled: bool` - Show/hide voice button
- `categoryHint: String?` - Pre-select category
- `multiline: bool` - Allow multiple lines
- `onSubmit: Function(String)` - Callback with text

**States:**
- `idle` - Default state
- `focused` - User typing (show keyboard)
- `voice_recording` - Mic active (pulse animation)
- `processing` - Sending to API (spinner)
- `success` - Memory created (checkmark, auto-clear)
- [error](file:///Users/geetag/Documents/koda/memory-os/setup.sh#27-30) - Failed (shake animation, show error)

**Behavior:**
- Tap: Focus and show keyboard
- Voice button tap: Start recording
- Submit: Validate (min 3 chars), call API
- Auto-detect category from text
- Cache locally on offline

**Validation:**
- Min length: 3 characters
- Max length: 500 characters
- No special chars (emojis allowed)

---

#### 2. QuickAddBar
**Function**: Fast-entry shortcuts for common activities

**Props:**
- `category: String` - Which category's templates
- `templates: List<Template>` - Available shortcuts
- `onSelect: Function(Template)` - Callback

**States:**
- `collapsed` - Show 3-4 templates
- `expanded` - Show all templates (sheet)

**Behavior:**
- Horizontal scroll
- Tap template: Auto-fill input field
- Long press: Edit template
- Swipe up: Expand to full sheet

**Templates Structure:**
```dart
{
  icon: String,
  label: String,
  pre_fill_text: String,
  category: String
}
```

---

#### 3. VoiceInputButton
**Function**: Record voice for transcription

**Props:**
- `onRecordingComplete: Function(String)` - Returns transcribed text
- `maxDuration: int` - Max seconds (default 60)
- `language: String` - Speech language

**States:**
- `idle` - Ready to record
- `recording` - Active recording (pulse animation, timer)
- `processing` - Transcribing (spinner)
- `success` - Transcribed (show text preview)
- [error](file:///Users/geetag/Documents/koda/memory-os/setup.sh#27-30) - Failed (permission denied, network error)

**Behavior:**
- Tap: Start recording
- Tap again: Stop recording
- Hold: Record while holding, release to stop
- Auto-stop at maxDuration
- Show waveform visualization while recording

**Permissions:**
- Request microphone on first tap
- Handle denied gracefully (show alert)

---

### Display Widgets

#### 4. TimelineCard
**Function**: Display a single memory in feed

**Props:**
- `memory: Memory` - Memory object
- `variant: String` - condensed|detailed| mini
- `onTap: Function` - Navigate to detail
- `onLongPress: Function` - Show context menu

**States:**
- `normal` - Default display
- `selected` - Highlighted (for multi-select)
- `deleting` - Slide-out animation

**Behavior:**
- Tap: Navigate to Memory Detail screen
- Long press: Show menu (Edit, Delete, Share)
- Swipe left: Quick delete (with undo)
- Swipe right: Quick edit

**Data Binding:**
- Category icon (dynamic color)
- Title/content from `normalized_data`
- Timestamp (relative: "2h ago" or absolute: "Jan 14, 9:30 AM")
- Metrics pills (if extracted)

---

#### 5. CategoryIcon
**Function**: Visual category identifier

**Props:**
- `category: String` - Category name
- `size: double` - 16|24|32|48
- `style: String` - filled|outlined|minimal

**States:**
- `active` - Full opacity, colored
- `inactive` - 50% opacity, grayed
- `pulsing` - For current selection

**Behavior:**
- Static (no interaction by default)
- Optional tap: Filter by category

**Icon Mapping:**
- fitness: 💪 (dumbbell)
- finance: 💵 (money)
- routine: ✅ (checkmark)
- health: ❤️ (heart)
- mindfulness: 🧘 (meditation)
- generic: 📝 (note)

---

#### 6. MetricCard
**Function**: Display quantifiable data with trend

**Props:**
- `value: dynamic` - Number/duration/currency
- `unit: String` - Unit of measurement
- `label: String` - Metric name
- `trend: double?` - Percent change
- `trendDirection: String?` - up|down|neutral

**States:**
- `loading` - Shimmer effect
- `loaded` - Show data
- [error](file:///Users/geetag/Documents/koda/memory-os/setup.sh#27-30) - Show "--"

**Behavior:**
- Tap: Navigate to detailed metric view
- Animated counter on value change

**Formatting:**
- Numbers: Comma separators (1,234)
- Currency: $ symbol, 2 decimals
- Duration: "45 min" or "1h 30m"
- Trend: "+15%" (green) or "-5%" (red)

---

### Tracking Widgets

#### 7. StreakIndicator
**Function**: Show consecutive days achievement

**Props:**
- `currentStreak: int` - Days in current streak
- `longestStreak: int` - Personal best
- `theme: String` - minimal|detailed|animated

**States:**
- `zero` - No streak (gray flame icon)
- `building` - 1-6 days (yellow flame)
- `strong` - 7-20 days (orange flame)
- `on_fire` - 21+ days (red flame with sparkles)

**Behavior:**
- Tap: Show streak calendar (heatmap of activity)
- Achievement at 3, 7, 21, 30, 100 days (confetti)
- Breaks streak if missed >1 day

**Animations:**
- Flame flickers on active
- Confetti burst on milestone
- Pulse effect on increment

---

#### 8. ConsistencyRing
**Function**: Circular progress for engagement score (0-100)

**Props:**
- `score: int` - 0-100
- `label: String` - Display label
- `size: double` - Ring diameter
- `strokeWidth: double` - Ring thickness

**States:**
- `loading` - Animated sweep
- `updating` - Smooth transition to new score
- `final` - Static display

**Behavior:**
- Animated fill on mount (1s duration)
- Tap: Show score breakdown modal
- Color changes:
  - 0-30: Red (at risk)
  - 31-60: Orange (improving)
  - 61-100: Green (excellent)

**Score Calculation:**
- Pulled from API `/consistency/:user_id`
- Updates every 6 hours
- Cache locally

---

#### 9. ProgressBar
**Function**: Linear progress visualization

**Props:**
- `current: double` - Current value
- `target: double` - Goal value
- `label: String` - Description
- `showPercentage: bool` - Display %

**States:**
- `in_progress` - Active progress
- `completed` - 100% reached (celebration)
- `exceeded` - Over 100% (different color)

**Behavior:**
- Animated fill (smooth transition)
- Completion triggers celebration
- Tap: Show detailed breakdown

**Variations:**
- Standard (single color)
- Gradient (multi-color blend)
- Segmented (step-by-step milestones)

---

#### 10. HabitCheckbox
**Function**: Daily habit completion toggle

**Props:**
- `habitId: String` - Habit identifier
- `date: DateTime` - Which day
- `completed: bool` - Current state
- `habitType: String` - build|quit

**States:**
- `unchecked` - Not completed (empty circle)
- `checked` - Completed (filled with checkmark)
- `failed` - Marked as failed (X icon, red)
- `skipped` - Intentionally skipped (dash icon)
- `loading` - Saving (spinner)

**Behavior:**
- Tap: Toggle completion
- Long press: Show options (Failed, Skipped, Add Note)
- Haptic feedback on check
- Optimistic UI (update immediately, sync later)
- Undo within 5 seconds

**API Integration:**
- POST `/habits/:id/complete`
- Payload: `{completed: true/false, notes}`

---

### Chart Widgets

#### 11. TrendChart
**Function**: Line/area/bar chart for time-series data

**Props:**
- `data: List<DataPoint>` - Time-series data
- `timeRange: String` - 7d|30d|90d|all
- `metricType: String` - count|duration|amount
- `chartType: String` - line|area|bar

**States:**
- `loading` - Skeleton animation
- `loaded` - Interactive chart
- `empty` - No data placeholder
- [error](file:///Users/geetag/Documents/koda/memory-os/setup.sh#27-30) - Failed to load

**Behavior:**
- Tap data point: Show tooltip with exact value
- Pinch zoom: Change time range
- Swipe left/right: Navigate time periods
- Long press: Show detailed breakdown

**Interactivity:**
- Crosshair on touch
- Tooltip with value + timestamp
- Highlight max/min points

---

#### 12. CalendarHeatmap
**Function**: GitHub-style activity density calendar

**Props:**
- `dates: List<DateTime>` - Activity dates
- `intensityScale: int` - Max intensity level (1-4)
- `startDate: DateTime` - Calendar start
- `endDate: DateTime` - Calendar end

**States:**
- `loading` - Skeleton grid
- `loaded` - Colored grid
- `interactive` - Show tooltips on hover

**Behavior:**
- Each cell represents one day
- Color intensity = activity count
- Tap cell: Show day detail
- 0 activity: light gray
- 1-2 activities: light green
- 3-4: medium green
- 5+: dark green

---

#### 13. CategoryDistribution
**Function**: Pie/donut chart for category breakdown

**Props:**
- `categories: List<Category>` - Category data
- `values: List<double>` - Corresponding values
- `chartStyle: String` - pie|donut|radial

**States:**
- `loading` - Rotating animation
- `loaded` - Static display
- `interactive` - Segment selection

**Behavior:**
- Tap segment: Highlight + show percentage
- Legend shows all categories
- Animated appearance (segments grow in)

---

### List Widgets

#### 14. MemoryList
**Function**: Scrollable feed of memories

**Props:**
- `memories: List<Memory>` - Memory data
- `filter: Filter?` - Active filters
- `sort: String` - newest|oldest|category

**States:**
- `loading` - Initial skeleton
- `loaded` - Show memories
- `refreshing` - Pull-to-refresh active
- `loadingMore` - Infinite scroll loading
- `empty` - No memories match filter

**Behavior:**
- Pull to refresh: Fetch latest
- Infinite scroll: Load 20 at a time
- Search: Filter locally first, then API
- Swipe actions: Edit, Delete
- Multi-select: Long press first item

**Optimization:**
- Lazy loading
- Virtual scrolling for 100+ items
- Image caching

---

#### 15. HabitList
**Function**: Grid or list of habits

**Props:**
- `habits: List<Habit>` - Habit data
- `showProgress: bool` - Display completion %
- `layout: String` - grid|list|compact

**States:**
- `loading` - Skeleton
- `loaded` - Show habits
- `reordering` - Drag to reorder

**Behavior:**
- Grid view: 2 columns
- List view: Full width
- Drag to reorder (save order to API)
- Filter: active|paused|completed

---

#### 16. InsightCard
**Function**: Display AI-generated insight

**Props:**
- `type: String` - achievement|warning|suggestion|pattern
- `title: String` - Insight headline
- `description: String` - Details
- `priority: String` - high|medium|low
- `cta: String?` - Optional call-to-action

**States:**
- `new` - Unread (badge)
- `read` - Read (no badge)
- `dismissed` - Hidden

**Behavior:**
- Tap: Expand to full detail
- Swipe left: Dismiss
- CTA button: Navigate to relevant screen
- Share button: Export as image

**Priority Display:**
- High: Red dot, top of list
- Medium: Orange dot, middle
- Low: Blue dot, bottom

---

### Action Widgets

#### 17. FloatingActionButton
**Function**: Primary action button

**Props:**
- `onPressed: Function` - Tap callback
- `icon: IconData` - Button icon
- `label: String?` - Optional text

**States:**
- `idle` - Ready
- `pressed` - Slight scale animation
- `loading` - Spinner
- `extended` - Shows label

**Behavior:**
- Tap: Execute primary action
- Scroll down: Hide (slide out)
- Scroll up: Show (slide in)
- Long press: Show submenu options

**Extended Variations:**
- Simple (icon only)
- Extended (icon + label)
- Menu (expands to show 2-4 options)

---

#### 18. CategorySelector
**Function**: Choose one or more categories

**Props:**
- `categories: List<String>` - Available categories
- `selected: String|List<String>` - Current selection
- `multiSelect: bool` - Allow multiple
- `onSelect: Function` - Callback

**States:**
- `collapsed` - Chips view
- `expanded` - Full grid/sheet

**Behavior:**
- Single select: Chips or dropdown
- Multi-select: Chips with checkmarks
- Tap to toggle
- "All" option clears others

**Display Styles:**
- Chips (horizontal scroll)
- Grid (2-3 columns)
- Dropdown (modal sheet)

---

#### 19. DateRangePicker
**Function**: Select time period

**Props:**
- `start: DateTime` - Start date
- `end: DateTime` - End date
- `presets: List<Preset>` - Quick options
- `onSelect: Function` - Callback

**States:**
- `showingPresets` - Quick select
- `showingCalendar` - Custom range

**Behavior:**
- Presets: 7d, 30d, 90d, This Month, All Time
- Custom: Show dual calendar
- Apply button: Confirm selection

**Presets:**
- Last 7 days
- Last 30 days
- Last 90 days
- This month
- This year
- All time
- Custom...

---

### Engagement Widgets

#### 20. MilestoneCard
**Function**: Celebrate achievements

**Props:**
- `milestone: Milestone` - Achievement data
- `icon: String` - Badge icon
- `message: String` - Congratulations text

**States:**
- `appearing` - Slide-in with confetti
- `displayed` - Static
- `dismissing` - Slide out

**Behavior:**
- Auto-appear on achievement
- Confetti animation
- Tap: View details
- Auto-dismiss after 5s (or manual)
- Share button: Post to social

**Triggers:**
- First memory
- 7-day streak
- 100 memories
- Habit formed (21 days)
- Category mastery

---

#### 21. EmptyState
**Function**: No data placeholder

**Props:**
- `icon: String` - Illustration
- `message: String` - Helpful text
- `action: Widget?` - Optional CTA button

**States:**
- `static` - No animation
- `animated` - Subtle animation loop

**Variations:**
- First time: "Get started" message
- Filtered: "No results" + clear filter button
- Error: "Something went wrong" + retry
- Offline: "Connect to sync"

---

#### 22. LoadingShimmer
**Function**: Content loading skeleton

**Props:**
- `type: String` - card|list|chart
- `count: int` - Number of skeletons

**States:**
- `animating` - Shimmer wave effect

**Behavior:**
- Matches actual content layout
- Smooth transition to real content
- Gray gradient with white wave

---

### Plan Widgets

#### 23. PlanCard
**Function**: Display generated behavior plan

**Props:**
- `plan: Plan` - Plan data
- `progress: double` - 0-100%

**States:**
- `not_started` - View only
- `in_progress` - Show current week
- `completed` - Celebration state
- `paused` - Dim display

**Behavior:**
- Tap: Open plan detail
- Progress ring shows completion
- Current phase highlighted
- Start/Resume button

---

#### 24. PhaseTimeline
**Function**: Multi-week plan visualization

**Props:**
- `phases: List<Phase>` - Week-by-week data
- `currentPhase: int` - Active week

**States:**
- `sequential` - Linear vertical
- `interactive` - Can jump to weeks

**Behavior:**
- Past weeks: Checkmark
- Current week: Highlighted
- Future weeks: Grayed
- Tap week: Show details
- Completion indicator per phase

---

##Complete Screen Functional Specifications

### Auth Flow

#### 1. Splash Screen
**Function**: App initialization and branding

**State Management:**
- Check auth token
- Load initial data
- Check API connectivity

**User Flows:**
- **New user**: → Onboarding
- **Existing user**: → Home Dashboard
- **Offline**: → Home (cached data)

**API Calls:** None
**Duration:** 1-2 seconds max

---

#### 2. Onboarding (3-4 slides)
**Function**: Introduce app value proposition

**Slides:**
1. "Track your life effortlessly" - Input illustration
2. "Get intelligent insights" - Analytics visualization
3. "Build better habits" - Habit tracking demo
4. "Create personalized plans" - Plan generator preview

**State:** `currentSlide: int`

**User Actions:**
- Swipe: Next/previous slide
- Skip: Jump to signup
- Get Started: Last slide → Signup

---

#### 3. Login/Register
**Function**: Authentication

**States:**
- `tab: login|register` - Active form
- `loading: bool` - API call in progress
- `error: String?` - Error message

**User Flows:**
- Login: Email + password → Home
- Register: Email + password + name → Category Setup
- Google Auth: One-tap → Home
- Forgot Password: Email → Reset link sent

**API Calls:**
- POST `/auth/login`
- POST `/auth/register`
- POST `/auth/google`

**Validation:**
- Email: Valid format
- Password: Min 8 chars, 1 number, 1 special char

---

#### 4. Category Setup
**Function**: First-time category selection

**State:**
- `selectedCategories: List<String>`
- `step: 1|2` (select categories, set goals)

**User Flow:**
1. Select 3-6 categories to track
2. Set initial goals/targets
3. → Home Dashboard

**API Calls:**
- POST `/user/categories`

---

### Home Tab

#### 5. Home Dashboard
**Function**: Today's overview and quick input

**State Management:**
```dart
{
  engagementScore: int,
  todayMemories: List<Memory>,
  todayHabits: List<Habit>,
  pendingReminders: int,
  lastSync: DateTime
}
```

**User Interactions:**
- Input field: Focus → Quick Input Modal
- Voice button: → Start recording
- Memory card tap: → Memory Detail
- Category chip tap: → Category Quick View
- Engagement ring tap: → Insights Dashboard
- Pull to refresh: Sync latest data

**API Calls:**
- GET `/memory?date=today`
- GET `/habits?status=active`
- GET `/consistency/:user_id`

**Refresh Logic:**
- Auto-refresh on app foreground
- Pull to manually refresh
- Update every 5 minutes if active

---

#### 6. Quick Input Modal
**Function**: Full-screen memory input

**State:**
```dart
{
  text: String,
  isRecording: bool,
  detectedCategories: List<String>,
  suggestedTemplates: List<Template>,
  isSubmitting: bool,
  error: String?
}
```

**User Flow:**
1. Type or speak input
2. Auto-detect category
3. Optional: Select template
4. Submit → Memory created → Close modal → Home refresh

**API Calls:**
- POST `/input/process`
- GET `/templates/:category`

**Validation:**
- Min 3 chars
- Max 500 chars

---

#### 7. Memory Detail
**Function**: View/edit single memory

**State:**
```dart
{
  memory: Memory,
  isEditing: bool,
  relatedMemories: List<Memory>
}
```

**User Actions:**
- Edit button: Enable editing
- Delete: Confirm → Delete → Back to previous screen
- Share: Export as text/image
- Related memories: Navigate to other memories

**API Calls:**
- GET `/memory/:id`
- PATCH `/memory/:id`
- DELETE `/memory/:id`

---

#### 8. Category Quick View
**Function**: Last 7 days for one category

**State:**
```dart
{
  category: String,
  memories: List<Memory>,
  stats: CategoryStats
}
```

**Display:**
- Mini trend chart
- Total count, average
- Latest 5 memories

**User Actions:**
- "View All": → Category Tracker
- Memory tap: → Memory Detail

**API Calls:**
- GET `/memory?category=:cat&range=7d`

---

### Track Tab

#### 9. Track Overview
**Function:** Browse all memories with filters

**State:**
```dart
{
  memories: List<Memory>,
  selectedCategory: String?,
  searchQuery: String,
  dateRange: DateRange,
  sort: String,
  isLoading: bool,
  hasMore: bool
}
```

**User Interactions:**
- Search: Filter memories locally + API
- Category chip: Filter by category
- Filter icon: → Filter Modal
- Memory tap: → Memory Detail
- Swipe left: Quick delete
- Swipe right: Quick edit
- Infinite scroll: Load more

**API Calls:**
- GET `/memory?filter=...&page=1&limit=20`

---

#### 10-15. Category Trackers (Fitness, Finance, Routine, Health, Mindfulness, Generic)
**Function**: Category-specific memory views

**Shared State:**
```dart
{
  memories: List<Memory>,
  categoryStats: Stats,
  chartData: List<DataPoint>,
  filter: Filter
}
```

**Category-Specific Displays:**

**Fitness:**
- Workout cards with duration, type
- Volume chart (sets × reps × weight)
- Split pattern indicator

**Finance:**
- Transaction list (income green, expense red)
- Spending trend chart
- Category pie chart

**Routine:**
- Checklist view
- Completion heatmap
- Routine stack visualization

**Health:**
- Sleep duration line chart
- Vitals dashboard (BP, HR, temp)
- Symptom timeline
- Medication adherence

**Mindfulness:**
- Meditation session cards
- Mood tracker (emoji scale)
- Gratitude entries
- Streak indicator

**Generic:**
- Timeline of events
- Note-style cards

**User Actions:**
- Add category-specific entry
- Filter by sub-type
- View charts/stats

---

#### 16. Search Results
**Function**: Display search matches

**State:**
```dart
{
  query: String,
  results: List<Memory>,
  filters: Applied filters
}
```

**User Interactions:**
- Tap result: → Memory Detail
- Clear search: Reset
- Refine filters: → Filter Modal

---

#### 17. Filter Modal
**Function**: Advanced filtering options

**State:**
```dart
{
  selectedCategories: List<String>,
  dateRange: DateRange,
  sortBy: String,
  hasMetrics: bool?
}
```

**Options:**
- Categories (multi-select)
- Date range (picker)
- Sort (newest, oldest, category)
- With metrics only (toggle)

**Actions:**
- Apply: Close modal + filter results
- Clear: Reset to defaults

---

#### 18. Memory Edit
**Function**: Modify existing memory

**State:**
```dart
{
  memory: Memory,
  editedText: String,
  editedCategory: String,
  isSaving: bool
}
```

**User Flow:**
1. Load memory data
2. Edit text/category
3. Save → API call → Navigate back

**API Calls:**
- PATCH `/memory/:id`

---

### Habits Tab

#### 19. Habits Dashboard
**Function**: Today's habit tracking

**State:**
```dart
{
  habits: List<Habit>,
  todayCompletions: Map<String, bool>,
  overallProgress: double,
  activeHabitsCount: int
}
```

**Display:**
- Completion summary (4/6 completed)
- Progress bar
- Habit grid (2 columns)
- Each card: Name, checkbox, streak

**User Interactions:**
- Checkbox tap: → Habit Completion → Update
- Habit card tap: → Habit Detail
- FAB: → Add/Edit Habit
- Pull to refresh: Sync

**API Calls:**
- GET `/habits?status=active`
- POST `/habits/:id/complete`

---

#### 20. Habit Detail
**Function**: Single habit analytics

**State:**
```dart
{
  habit: Habit,
  completions: List<Completion>,
  stats: HabitStats
}
```

**Display:**
- Habit info (name, type, target)
- Calendar heatmap (last 90 days)
- Streak stats (current, longest)
- Completion rate %
- Gap analysis

**User Actions:**
- Edit: → Add/Edit Habit
- Delete: Confirm → Delete → Back
- Share: Export progress image

**API Calls:**
- GET `/habits/:id/progress`

---

#### 21. Add/Edit Habit
**Function**: Create or modify habit

**State:**
```dart
{
  mode: add|edit,
  habitName: String,
  habitType: build|quit,
  category: String,
  targetFrequency: int,
  targetUnit: daily|weekly|monthly,
  reminderTime: TimeOfDay?,
  reminderDays: List<int>
}
```

**Form Fields:**
- Habit name (required)
- Type: Build/Quit (toggle)
- Category (dropdown)
- Target (number + unit)
- Reminder settings

**Validation:**
- Name: 3-50 chars
- Target: > 0

**API Calls:**
- POST `/habits` (add)
- PATCH `/habits/:id` (edit)

---

#### 22. Habit Completion
**Function**: Log daily check-in

**State:**
```dart
{
  habitId: String,
  completed: bool,
  notes: String,
  mood: String?
}
```

**User Flow:**
1. Select completed/failed
2. Optional: Add notes
3. Submit → Streak update → Celebration if milestone

**API Calls:**
- POST `/habits/:id/complete`

---

#### 23. Habit Templates
**Function**: Pre-defined habit suggestions

**State:**
```dart
{
  category: String?,
  templates: List<Template>
}
```

**Display:**
- Categorized templates
- Popular habits
- AI-suggested based on patterns

**User Actions:**
- Tap template: → Add/Edit Habit (pre-filled)

---

#### 24. Habit Progress
**Function**: Detailed analytics for one habit

**State:**
```dart
{
  habitId: String,
  progressData: ChartData,
  milestones: List<Milestone>
}
```

**Charts:**
- Completion trend (line chart)
- Best streak history
- Missed days patterns

---

#### 25. Reminders Settings
**Function**: Configure habit notifications

**State:**
```dart
{
  habitId: String,
  reminderEnabled: bool,
  reminderTime: TimeOfDay,
  reminderDays: List<int>,
  soundEnabled: bool
}
```

**Settings:**
- Enable/disable
- Time picker
- Day selection (multi-select)
- Sound/vibration

**API Calls:**
- PATCH `/habits/:id` (update settings)

---

### Insights Tab

#### 26. Insights Dashboard
**Function**: Overall analytics overview

**State:**
```dart
{
  engagementScore: int,
  categoryScores: Map<String, int>,
  recentInsights: List<Insight>,
  achievements: List<Achievement>
}
```

**Display:**
- Large engagement ring (center)
- Stats grid (streak, active days, events, risk)
- Category mini-rings (6 categories)
- Insight cards list

**User Actions:**
- Ring tap: → Consistency Analysis
- Category ring tap: → Category Insights
- Insight card tap: Expand detail
- Pull to refresh: Re-calculate

**API Calls:**
- GET `/consistency/:user_id`
- GET `/insights/recent`

---

#### 27. Consistency Analysis
**Function**: Deep-dive into engagement metrics

**State:**
```dart
{
  overallScore: int,
  breakdown: ScoreBreakdown,
  trend: List<DataPoint>,
  riskLevel: String
}
```

**Display:**
- Score components (recency 40%, frequency 30%, streak 20%, growth 10%)
- Trend chart (30 days)
- Risk assessment
- Recommendations

**API Calls:**
- GET `/consistency/:user_id`

---

#### 28. Patterns Detected
**Function**: AI-discovered patterns

**State:**
```dart
{
  patterns: List<Pattern>,
  correlations: List<Correlation>
}
```

**Pattern Types:**
- Time-based (always workout at 7am)
- Sequential (coffee → gym)
- Correlations (mood vs sleep)

**User Actions:**
- Tap pattern: See examples
- Create habit from pattern

**API Calls:**
- GET `/patterns/detect`

---

#### 29-34. Category Insights (×6)
**Function**: Per-category analytics

**State:**
```dart
{
  category: String,
  consistencyScore: int,
  patterns: List<Pattern>,
  recommendations: List<String>,
  chartData: CategoryChartData
}
```

**Display:**
- Category-specific metrics
- Insights and patterns
- Actionable recommendations
- Charts relevant to category

---

#### 35. Achievements
**Function**: Milestones earned

**State:**
```dart
{
  earnedBadges: List<Badge>,
  inProgress: List<Badge>,
  totalPoints: int
}
```

**Badge Categories:**
- Streaks (3, 7, 21, 100 days)
- Volume (10, 100, 1000 memories)
- Habits (formed, mastered)
- Categories (completionist)

---

#### 36. Gap Analysis
**Function**: Identify missed periods

**State:**
```dart
{
  gaps: List<Gap>,
  category: String?
}
```

**Display:**
- List of gaps (date range, duration)
- Severity (low, medium, high)
- Suggestions to prevent

**API Calls:**
- GET `/consistency/:user_id/gaps`

---

### Profile Tab

#### 37. Profile Overview
**Function**: User info and quick stats

**State:**
```dart
{
  user: User,
  totalStats: Stats,
  subscriptionStatus: String
}
```

**Display:**
- Avatar, name, email
- Total memories, current streak
- Subscription badge
- Quick links (Plans, Settings)

---

#### 38. Plans Dashboard
**Function**: View all plans

**State:**
```dart
{
  activePlans: List<Plan>,
  completedPlans: List<Plan>
}
```

**User Actions:**
- Tap plan: → Plan Detail
- Create new: → Generate Plan

**API Calls:**
- GET `/plans`

---

#### 39. Plan Detail
**Function**: View single plan progress

**State:**
```dart
{
  plan: Plan,
  currentWeek: int,
  progress: double
}
```

**Display:**
- Phase timeline
- Current week details
- Progress tracking
- Next steps

---

#### 40. Generate Plan
**Function**: AI plan creation

**State:**
```dart
{
  selectedCategory: String,
  selectedGoal: String,
  customization: Map,
  generatedPlan: Plan?,
  isGenerating: bool
}
```

**User Flow:**
1. Select category
2. Choose goal template
3. Customize (optional)
4. Generate → API call → View plan
5. Accept → Plan Detail

**API Calls:**
- POST `/plans/generate`

---

#### 41. Plan Progress
**Function**: Week-by-week tracking

**State:**
```dart
{
  planId: String,
  weeks: List<Week>,
  currentWeek: int,
  completions: Map<int, bool>
}
```

**Display:**
- Vertical timeline
- Past weeks (checkmarks)
- Current week (highlighted)
- Future weeks (grayed)

---

#### 42. Settings
**Function**: App configuration

**Sections:**
- Profile settings
- Notification settings
- Category management
- Data & privacy
- About

**User Actions:**
- Edit profile
- Toggle notifications
- Manage categories
- Export data
- Delete account

---

#### 43. Subscription
**Function**: Premium upgrade flow

**State:**
```dart
{
  currentTier: String,
  features: Map<String, bool>,
  pricing: PricingData
}
```

**Display:**
- Current plan badge
- Feature comparison table
- Pricing cards
- Upgrade CTA

**API Calls:**
- GET `/subscription/plans`
- POST `/subscription/upgrade`

---

### Additional Screens

#### 44. Notifications
**Function**: Notification center

**State:**
```dart
{
  notifications: List<Notification>,
  unreadCount: int
}
```

**Types:**
- Habit reminders
- Scenario nudges
- Achievements
- System messages

---

#### 45. Help & Support
**Function**: FAQ and contact

**Sections:**
- FAQ (searchable)
- Contact form
- Feature requests
- Bug report

---

#### 46. Tutorial
**Function**: Interactive guide

**Topics:**
- How to log memories
- Understanding insights
- Creating habits
- Generating plans

---

**Ready for implementation!** 🚀

This document provides complete functional specifications for all screens and widgets.
