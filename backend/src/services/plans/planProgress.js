import { query } from '../../db/index.js';
import NotificationModel from '../../models/notification.model.js';

class PlanProgressService {
    /**
     * Update plan progress based on new memory
     * @param {Object} memory - The new memory object
     */
    async updateProgress(memory) {
        // Handle both camelCase (app) and snake_case (db) keys
        const userId = memory.userId || memory.user_id;
        const category = memory.category;

        if (!userId) {
            console.error('[PlanProgress] Error: User ID is missing from memory object:', memory);
            return;
        }

        console.log(`[PlanProgress] Checking updates for user ${userId} in category ${category}`);

        // 1. Find active plans for this user and category
        const activePlansResult = await query(`
            SELECT * FROM plans 
            WHERE user_id = $1 
              AND LOWER(category) = LOWER($2) 
              AND status = 'active'
        `, [userId, category]);

        const activePlans = activePlansResult.rows;

        if (activePlans.length === 0) {
            console.log(`[PlanProgress] No plans match category "${category}".`);
            return;
        }

        // 2. Update progress for each relevant plan
        for (const plan of activePlans) {
            // Get current phase info
            const phases = plan.plan_data.phases || [];
            const currentWeekIdx = (plan.current_week || 1) - 1;
            const currentPhase = phases[currentWeekIdx] || phases[0];

            if (!currentPhase) continue;

            const newProgress = (plan.progress || 0) + 1;

            // Determine Target (Frequency)
            let target = 3; // Default
            if (currentPhase.frequency) target = currentPhase.frequency;
            else if (currentPhase.target && typeof currentPhase.target === 'number') target = currentPhase.target;
            else if (currentPhase.target && typeof currentPhase.target === 'string') {
                const match = currentPhase.target.match(/\d+/);
                if (match) target = parseInt(match[0]);
            }

            // Update DB
            await query(`
                UPDATE plans 
                SET progress = $1, 
                    last_updated_at = NOW()
                WHERE id = $2
            `, [newProgress, plan.id]);

            console.log(`[PlanProgress] Updated plan "${plan.plan_name}" progress to ${newProgress}`);

            // 3. Send Immediate Feedback Notification
            await this.sendFeedbackNotification(userId, plan, newProgress, target);
        }
    }

    /**
     * Send feedback notification
     */
    async sendFeedbackNotification(userId, plan, current, target) {
        try {
            let title = 'Plan Update';
            let body = `Progress updated for ${plan.plan_name}.`;
            let type = 'plan_update';

            if (current >= target) {
                // Goal Met!
                title = '🎉 Weekly Goal Met!';
                body = `You crushed your "${plan.plan_name}" goal for the week! (${current}/${target})`;
                type = 'plan_goal_met';
            } else {
                // Encouragement
                const remaining = target - current;
                title = remaining === 1 ? 'Almost there! 🤏' : 'Great job! 👏';
                body = `You completed ${current}/${target} sessions for "${plan.plan_name}". Keep going!`;
            }

            await NotificationModel.create({
                userId,
                notificationType: type,
                title,
                body,
                scheduledFor: new Date(),
                relatedPlanId: plan.id,
                metadata: {
                    progress: current,
                    target: target,
                    plan_name: plan.plan_name
                }
            });

            console.log(`[PlanProgress] Sent notification: "${body}"`);
        } catch (error) {
            console.error('[PlanProgress] Failed to send notification:', error);
        }
    }
}

export default new PlanProgressService();
