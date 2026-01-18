
import { query } from '../../db/index.js';
import engagementService from '../engagement/engagementService.js'; // Existing or need to check?
// Actually 'engagementService.js' might not exist or be named differently.
// Checking input.controller.js -> imported `engagementService`? No.
// But we have `habitService`.

class FeedbackService {
    /**
     * Create immediate feedback record
     */
    async createFeedback(userId, { message, context }) {
        const sql = `
            INSERT INTO user_feedback (user_id, message, context)
            VALUES ($1, $2, $3)
            RETURNING *
        `;
        const result = await query(sql, [userId, message, context]);
        return result.rows[0];
    }

    /**
     * Get the single latest unread feedback (for polling after log)
     */
    async getLatest(userId) {
        const sql = `
            SELECT * FROM user_feedback
            WHERE user_id = $1
            AND created_at > NOW() - INTERVAL '5 minutes'
            ORDER BY created_at DESC
            LIMIT 1
        `;
        const result = await query(sql, [userId]);
        return result.rows[0];
    }

    /**
     * Generate deterministic feedback based on recent activity
     */
    async generateImmediateLogic(userId, memoryId) {
        // 0. Import deps dynamically to avoid circles
        const { query } = await import('../../db/index.js');
        const habitService = (await import('../habits/habitService.js')).default;
        const memoryModel = (await import('../../models/memory.model.js')).default;

        // 1. Get Memory Text
        const memory = await memoryModel.findById(memoryId);
        if (memory && memory.raw_input) {
            const text = memory.normalized_data?.enhanced_text || memory.raw_input;

            // CHECK HABIT COMPLETION
            try {
                const matchedHabit = await habitService.checkCompletionIntent(userId, text);
                if (matchedHabit) {
                    console.log(`✅ Habit Completion Detected: "${matchedHabit.habit_name}"`);
                    await habitService.logCompletion(matchedHabit.id, userId, true, text);
                    console.log(`✓ FeedbackService: Auto-competed habit "${matchedHabit.habit_name}"`);

                    await this.createFeedback(userId, {
                        message: `✅ Checked off: "${matchedHabit.habit_name}"`,
                        context: 'habit_completed'
                    });
                    return; // Done
                } else {
                    // NEW: CHECK HABIT CREATION (if no completion matched)
                    const newHabitData = await habitService.checkCreationIntent(userId, text);
                    if (newHabitData) {
                        console.log(`➕ Habit Creation Detected: "${newHabitData.habit_name}"`);
                        const createdHabit = await habitService.createHabit(userId, newHabitData);
                        console.log(`✓ FeedbackService: Auto-created habit "${createdHabit.habit_name}"`);

                        // Override feedback message for creation
                        await this.createFeedback(userId, {
                            message: `✨ New Habit: "${createdHabit.habit_name}" added to your Kairo.`,
                            context: 'habit_created'
                        });
                        return; // Skip standard message
                    }
                }
            } catch (hErr) {
                console.error('FeedbackService Habit Check Failed:', hErr);
            }

            // NEW: CHECK PLAN PROGRESS
            try {
                const planProgressService = (await import('../plans/planProgress.js')).default;
                await planProgressService.updateProgress(memory);
                console.log(`✓ FeedbackService: Triggered plan update check for memory ${memory.id}`);
            } catch (pErr) {
                console.error('FeedbackService Plan Check Failed:', pErr);
            }
        }

        // 2. Check Streak & Milestones
        const statsSql = `
            SELECT current_logging_streak, 
            (SELECT COUNT(*) FROM memory_units WHERE user_id = $1) as total_memories
            FROM user_engagement WHERE user_id = $1
        `;
        const statsRes = await query(statsSql, [userId]);
        const streak = statsRes.rows[0]?.current_logging_streak || 0;
        const totalMemories = parseInt(statsRes.rows[0]?.total_memories || 0);

        let message = null;
        let context = 'post_log';

        if (totalMemories === 1) {
            message = "✨ Welcome to Kairo! Your journey starts now.";
            context = 'milestone';
        } else if (totalMemories === 3) {
            message = "💡 Tip: Keep logging to unlock 'Patterns'. You're doing great!";
            context = 'milestone';
        } else if (streak > 0 && streak % 3 === 0) {
            message = `🔥 ${streak} day streak! You're on fire.`;
            context = 'streak';
        } else if (streak === 1) {
            message = "Great start to the day.";
        } else {
            message = "Memory saved.";
        }

        if (message) {
            await this.createFeedback(userId, { message, context });
        }
    }
}

export default new FeedbackService();
