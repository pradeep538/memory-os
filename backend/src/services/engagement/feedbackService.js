
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
                    await habitService.logCompletion(matchedHabit.id, userId, true, text);
                    console.log(`✓ FeedbackService: Auto-competed habit "${matchedHabit.habit_name}"`);
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

        // 2. Check Streak (Existing Logic)
        const streakSql = `
            SELECT current_logging_streak FROM user_engagement WHERE user_id = $1
        `;
        const streakRes = await query(streakSql, [userId]);
        const streak = streakRes.rows[0]?.current_logging_streak || 0;

        let message = null;
        let context = 'post_log';

        if (streak > 0 && streak % 3 === 0) {
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
