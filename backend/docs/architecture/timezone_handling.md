# Smart Insights & Timezone Standardization

## Architecture Overview

We have successfully merged **Statistical Patterns** with **LLM-Based Insights** and standardized **Global Timezone Handling**.

### 1. The "Novelty Engine" Flow
This flow ensures users get high-quality, non-repetitive insights.
1.  **Pattern Detection**: Python service detects raw patterns (Frequency/Time) from UTC data.
2.  **Novelty Check**: Node.js backend (`analysis.worker.js`) asks LLM: "Is this new compared to the last 5 insights?"
    *   **Context**: Last 5 insights are passed to LLM.
    *   **Prompt**: "If this is a repeat, return null."
3.  **Insight Generation**: If novel, LLM generates a friendly message (e.g., "You're a night owl!").
4.  **Storage**: Saved as `type: 'insight'` in `feed_items`.

### 2. Global Timezone Architecture 🌍(The "One Place")
We implemented a **Single Source of Truth** for time handling: `src/services/time/timeService.js`.

#### How it works (Step-by-Step):

**A. Storage (The "Source")**
*   **Database**: All timestamps (`created_at`, `memory_time`) are stored in **UTC**.
*   **User Preference**: `users` table has a `timezone` column (e.g., `'America/New_York'`).

**B. Backend Processing (The "Brain")**
*   When we need to process time (for Notifications, Habits, or Insights), we **NEVER** use `new Date()` (server time).
*   We call `TimeService`:
    *   `TimeService.getUserTimezone(userId)`
    *   `TimeService.formatTimeForUser(userId, utcDate)`
*   **For LLM**: We inject the **Calculated Local Time** into the prompt.
    *   *Input*: "Peak 08:00 UTC", User: "NY".
    *   *Logic*: Backend calculates "3:00 AM".
    *   *Prompt*: "The user is in NY. 08:00 UTC is **3:00 AM**. Write the insight using '3:00 AM'."
    *   *LLM Output*: "You drink coffee at 3 AM."

**C. Client Display (The "Face")**
*   **Insight Text**: The text body ("...at 3 AM") is pre-localized by the LLM. It's just a string.
*   **Metadata**: The `created_at` timestamp is sent as UTC ISO string. The Mobile App uses a standard library (e.g., `intl`) to show "2 hours ago" or "10:30 AM" based on the **Device's** local settings.

#### System Updates
| Component | Change |
| :--- | :--- |
| **Patterns** | LLM is explicitly told the User's Local Time. |
| **Scheduler** | Jobs run **Hourly** and check: "Is it 8AM *for this user*?" |
| **Habits** | "Today" is defined by User's Timezone, protecting streaks. |

## Verification
*   **Test Script**: `verify_timezone.js`
*   **Result**: 
    *   Seeded "Coffee at 8 AM UTC" (User in NY).
    *   LLM Insight: "You drink coffee around **3:00 AM**". ✅
