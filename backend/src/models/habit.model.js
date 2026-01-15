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
     */
    static async logCompletion(habitId, userId, completed, notes = null) {
        const today = new Date().toISOString().split('T')[0];

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

        const result = await db.query(query, [habitId, userId, today, completed, notes]);

        // Update streak
        await this.updateStreak(habitId);

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
     */
    static async updateStreak(habitId) {
        // Get recent completions
        const completions = await this.getCompletions(habitId, 90);

        if (completions.length === 0) {
            return;
        }

        // Calculate current streak
        let currentStreak = 0;
        const today = new Date().toISOString().split('T')[0];

        // Sort by date descending
        completions.sort((a, b) =>
            new Date(b.completion_date) - new Date(a.completion_date)
        );

        // Check if today/yesterday has completion
        const latestDate = completions[0].completion_date.toISOString().split('T')[0];
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (latestDate !== today && latestDate !== yesterdayStr) {
            // Streak broken
            currentStreak = 0;
        } else {
            // Count consecutive completions
            for (let i = 0; i < completions.length; i++) {
                if (completions[i].completed) {
                    currentStreak++;

                    // Check if next day is consecutive
                    if (i < completions.length - 1) {
                        const current = new Date(completions[i].completion_date);
                        const next = new Date(completions[i + 1].completion_date);
                        const diffDays = Math.floor((current - next) / (1000 * 60 * 60 * 24));

                        if (diffDays > 1) {
                            break; // Streak broken
                        }
                    }
                } else {
                    break; // Missed day
                }
            }
        }

        // Find longest streak
        let longestStreak = currentStreak;
        let tempStreak = 0;

        for (const completion of completions) {
            if (completion.completed) {
                tempStreak++;
                longestStreak = Math.max(longestStreak, tempStreak);
            } else {
                tempStreak = 0;
            }
        }

        // Update habit
        await db.query(`
      UPDATE habits
      SET 
        current_streak = $1,
        longest_streak = GREATEST(longest_streak, $2),
        updated_at = NOW()
      WHERE id = $3
    `, [currentStreak, longestStreak, habitId]);
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
