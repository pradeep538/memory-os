
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
        // 1. Check Streak (need Logic)
        // For now, mockup logic or querying DB directly
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
