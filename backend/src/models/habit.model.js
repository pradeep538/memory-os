import db from '../db/index.js';

/**
 * Habit Model - Build and Quit Habits
 */
class HabitModel {
    /**
     * Create a new habit
     */
    static async create(userId, habitData) {
        const {
            habitName,
            habitType,
            category,
            description,
            targetFrequency,
            targetFrequencyUnit,
            baselineFrequency,
            targetMaxFrequency,
            reminderEnabled,
            reminderTime,
            reminderDays,
            targetCompletionDate
        } = habitData;

        const query = `
      INSERT INTO habits (
        user_id, habit_name, habit_type, category, description,
        target_frequency, target_frequency_unit,
        baseline_frequency, target_max_frequency,
        reminder_enabled, reminder_time, reminder_days,
        target_completion_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

        const values = [
            userId,
            habitName,
            habitType,
            category || null,
            description || null,
            targetFrequency,
            targetFrequencyUnit || 'weekly',
            baselineFrequency || null,
            targetMaxFrequency || null,
            reminderEnabled ?? true,
            reminderTime || null,
            reminderDays || null,
            targetCompletionDate || null
        ];

        const result = await db.query(query, values);
        return result.rows[0];
    }

    /**
     * Get all habits for a user
     */
    static async findByUser(userId, status = 'active') {
        const query = `
      SELECT *
      FROM habits
      WHERE user_id = $1
        AND status = $2
      ORDER BY created_at DESC
    `;

        const result = await db.query(query, [userId, status]);
        return result.rows;
    }

    /**
     * Get single habit
     */
    static async findById(habitId) {
        const query = 'SELECT * FROM habits WHERE id = $1';
        const result = await db.query(query, [habitId]);
        return result.rows[0];
    }

    /**
     * Update habit
     */
    static async update(habitId, updates) {
        const allowedFields = [
            'habit_name', 'description', 'target_frequency',
            'target_frequency_unit', 'status', 'reminder_enabled',
            'reminder_time', 'reminder_days', 'target_completion_date'
        ];

        const setClause = [];
        const values = [];
        let paramIndex = 1;

        Object.keys(updates).forEach(key => {
            if (allowedFields.includes(key)) {
                setClause.push(`${key} = $${paramIndex}`);
                values.push(updates[key]);
                paramIndex++;
            }
        });

        if (setClause.length === 0) {
            throw new Error('No valid fields to update');
        }

        setClause.push('updated_at = NOW()');
        values.push(habitId);

        const query = `
      UPDATE habits
      SET ${setClause.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

        const result = await db.query(query, values);
        return result.rows[0];
    }

    /**
     * Delete habit
     */
    static async delete(habitId) {
        const query = 'DELETE FROM habits WHERE id = $1 RETURNING *';
        const result = await db.query(query, [habitId]);
        return result.rows[0];
    }

    /**
     * Log habit completion
     * completionDate: 'YYYY-MM-DD' (User's Local Date)
     */
    static async logCompletion(habitId, userId, completed, completionDate, notes = null) {
        if (!completionDate) throw new Error("completionDate (YYYY-MM-DD) is required");

        const query = `
      INSERT INTO habit_completions (
        habit_id, user_id, completion_date, completed, notes
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (habit_id, completion_date)
      DO UPDATE SET
        completed = EXCLUDED.completed,
        notes = EXCLUDED.notes
      RETURNING *
    `;

        const result = await db.query(query, [habitId, userId, completionDate, completed, notes]);

        // Update streak using the submitted date reference
        await this.updateStreak(habitId, completionDate);

        return result.rows[0];
    }

    /**
     * Get habit completions
     */
    static async getCompletions(habitId, days = 30) {
        const query = `
      SELECT *
      FROM habit_completions
      WHERE habit_id = $1
        AND completion_date >= CURRENT_DATE - INTERVAL '${days} days'
      ORDER BY completion_date DESC
    `;

        const result = await db.query(query, [habitId]);
        return result.rows;
    }

    /**
     * Calculate and update streak
     * referenceDate: 'YYYY-MM-DD' (The "Today" anchor for calculation)
     */
    static async updateStreak(habitId, referenceDate = null) {
        // 1. Get habit details for frequency targets
        const habit = await this.findById(habitId);
        if (!habit) return;

        // If no reference date provided, fallback to NOW (UTC) - Legacy/Safety
        const anchorDate = referenceDate || new Date().toISOString().split('T')[0];

        const unit = habit.target_frequency_unit || 'day';
        const target = habit.target_frequency || 1;

        // 2. Get recent completions
        const completions = await this.getCompletions(habitId, 365); // Look back further
        if (completions.length === 0) {
            await this.updateStreakValue(habitId, 0, habit.longest_streak);
            return;
        }

        let currentStreak = 0;

        // Helper to get time key (YYYY-MM-DD or YYYY-Wxx or YYYY-MM)
        const getTimeKey = (dateStr) => {
            const d = new Date(dateStr);
            if (unit === 'day') return dateStr; // YYYY-MM-DD
            if (unit === 'month') return `${d.getFullYear()}-${d.getMonth() + 1}`;

            // Weekly (ISO Week)
            const date = new Date(dateStr);
            date.setHours(0, 0, 0, 0);
            date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
            const week1 = new Date(date.getFullYear(), 0, 4);
            const week = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
            return `${date.getFullYear()}-W${week}`;
        };

        // Helper to decrement time key
        const decrementKey = (key) => {
            if (unit === 'day') {
                const d = new Date(key);
                d.setDate(d.getDate() - 1);
                return d.toISOString().split('T')[0];
            }
            if (unit === 'month') {
                const [y, m] = key.split('-').map(Number);
                const d = new Date(y, m - 1 - 1, 1);
                return `${d.getFullYear()}-${d.getMonth() + 1}`;
            }
            if (unit === 'week') {
                // Parse YYYY-Wxx
                const [y, w] = key.split('-W').map(Number);
                // Simple approx: subtract 7 days from purely calculated date?
                // Hard to do strictly with Key string.
                // Better: Use Date object iteration.
                return null; // Logic handled below by iterating dates instead
            }
        };

        // 3. Group completions by period
        const counts = {};
        completions.forEach(c => {
            if (c.completed) {
                const key = getTimeKey(c.completion_date.toISOString().split('T')[0]);
                counts[key] = (counts[key] || 0) + 1;
            }
        });

        // 4. Calculate Streak
        // Start from Anchor (Today). 
        const todayKey = getTimeKey(anchorDate);
        let checkKey = todayKey;

        // Check if current period is valid
        if ((counts[checkKey] || 0) >= target) {
            currentStreak++;
        } else {
            // Adjust start key:
            let prevKey = decrementKey(todayKey);
            if (unit === 'week') { // Manual decrement for week
                const d = new Date(anchorDate); // Use anchorDate
                d.setDate(d.getDate() - 7);
                prevKey = getTimeKey(d.toISOString().split('T')[0]);
            }

            if ((counts[prevKey] || 0) >= target) {
                // Current period pending, but previous done. Start counting from previous.
                checkKey = prevKey;
                currentStreak++; // Count the previous one
            } else {
                // Neither Today nor prev done -> Streak 0.
                await this.updateStreakValue(habitId, 0, habit.longest_streak);
                return;
            }
        }

        // Check previous periods
        let dateIter = new Date(anchorDate); // Use anchorDate
        if (checkKey !== todayKey) dateIter.setDate(dateIter.getDate() - (unit === 'week' ? 7 : unit === 'month' ? 30 : 1));

        // Use a loop MAX 365
        for (let i = 1; i < 365; i++) {
            // Decrement date by 1 unit
            if (unit === 'week') dateIter.setDate(dateIter.getDate() - 7);
            else if (unit === 'month') dateIter.setMonth(dateIter.getMonth() - 1);
            else dateIter.setDate(dateIter.getDate() - 1);

            const prevKey = getTimeKey(dateIter.toISOString().split('T')[0]);

            if ((counts[prevKey] || 0) >= target) {
                currentStreak++;
            } else {
                break;
            }
        }

        await this.updateStreakValue(habitId, currentStreak, Math.max(habit.longest_streak, currentStreak));
    }

    static async updateStreakValue(habitId, current, longest) {
        await db.query(`
            UPDATE habits
            SET current_streak = $1, longest_streak = $2, updated_at = NOW()
            WHERE id = $3
        `, [current, longest, habitId]);
    }

    /**
     * Get habit progress
     */
    static async getProgress(habitId) {
        const habit = await this.findById(habitId);
        if (!habit) {
            throw new Error('Habit not found');
        }

        const completions = await this.getCompletions(habitId, 30);

        return {
            habit,
            current_streak: habit.current_streak,
            longest_streak: habit.longest_streak,
            completion_rate: habit.completion_rate,
            total_completions: habit.total_completions,
            recent_completions: completions,
            days_active: completions.filter(c => c.completed).length,
            days_missed: completions.filter(c => !c.completed).length
        };
    }
}

export default HabitModel;
