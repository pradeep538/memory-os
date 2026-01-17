import { query } from '../../db/index.js';
import NotificationModel from '../../models/notification.model.js';

/**
 * Adaptive Scaling Service
 * Implements science-based difficulty adjustment following BJ Fogg's Behavior Model
 */
class PlanAdaptiveService {
    /**
     * Assess weekly performance and adjust difficulty if needed
     * Should be called on Sunday evening
     */
    async assessWeeklyPerformance(plan) {
        const userId = plan.user_id;
        const target = this.extractTarget(plan);
        const actual = plan.progress || 0;

        console.log(`[Adaptive] Assessing plan "${plan.plan_name}": ${actual}/${target}`);

        // Record performance
        await this.recordPerformance(plan.id, actual, target);

        // Determine if target was met
        const success = actual >= target;

        if (success) {
            await this.handleSuccess(plan, actual, target);
        } else {
            await this.handleFailure(plan, actual, target);
        }
    }

    /**
     * Handle successful week
     */
    async handleSuccess(plan, actual, target) {
        const userId = plan.user_id;

        // Reset failure counter
        const newWeeksAtLevel = (plan.weeks_at_current_level || 0) + 1;

        await query(`
            UPDATE plans 
            SET consecutive_failures = 0,
                weeks_at_current_level = $1
            WHERE id = $2
        `, [newWeeksAtLevel, plan.id]);

        console.log(`[Adaptive] Success! Weeks at current level: ${newWeeksAtLevel}`);

        // Progressive overload: Suggest increase after 3 successful weeks
        if (newWeeksAtLevel >= 3 && plan.difficulty_level < 1.5) {
            await this.suggestIncrease(plan, userId);
        } else {
            // Just encouragement
            await NotificationModel.create({
                userId,
                notificationType: 'plan_success',
                title: '🎯 Weekly Goal Met!',
                body: `Great job on "${plan.plan_name}"! You completed ${actual}/${target} sessions.`,
                scheduledFor: new Date(),
                relatedPlanId: plan.id,
                metadata: {
                    actual,
                    target,
                    streak: newWeeksAtLevel
                }
            });
        }
    }

    /**
     * Handle failed week
     */
    async handleFailure(plan, actual, target) {
        const userId = plan.user_id;
        const newConsecutiveFailures = (plan.consecutive_failures || 0) + 1;

        await query(`
            UPDATE plans 
            SET consecutive_failures = $1,
                weeks_at_current_level = 0
            WHERE id = $2
        `, [newConsecutiveFailures, plan.id]);

        console.log(`[Adaptive] Failure. Consecutive failures: ${newConsecutiveFailures}`);

        if (newConsecutiveFailures === 1) {
            // First miss - encouragement
            await NotificationModel.create({
                userId,
                notificationType: 'plan_encouragement',
                title: 'Keep Going! 💪',
                body: `You were close on "${plan.plan_name}" (${actual}/${target}). Let's nail it this week!`,
                scheduledFor: new Date(),
                relatedPlanId: plan.id,
                metadata: {
                    actual,
                    target,
                    miss_count: 1
                }
            });
        } else if (newConsecutiveFailures >= 2) {
            // Adaptive intervention - scale down
            await this.scaleDown(plan, userId, actual, target, newConsecutiveFailures);
        }
    }

    /**
     * Scale down difficulty after repeated failures
     */
    async scaleDown(plan, userId, actual, target, failureCount) {
        const currentDifficulty = plan.difficulty_level || 1.0;
        const newDifficulty = Math.max(0.5, currentDifficulty * 0.7); // 30% reduction, min 0.5
        const newTarget = Math.max(1, Math.ceil(target * 0.7));

        await query(`
            UPDATE plans 
            SET difficulty_level = $1,
                weeks_at_current_level = 0
            WHERE id = $2
        `, [newDifficulty, plan.id]);

        // Update the phase target
        const planData = plan.plan_data;
        const currentWeekIdx = (plan.current_week || 1) - 1;
        if (planData.phases && planData.phases[currentWeekIdx]) {
            planData.phases[currentWeekIdx].frequency = newTarget;

            await query(`
                UPDATE plans 
                SET plan_data = $1
                WHERE id = $2
            `, [planData, plan.id]);
        }

        console.log(`[Adaptive] Scaled down: ${target} → ${newTarget} (difficulty: ${newDifficulty.toFixed(2)})`);

        await NotificationModel.create({
            userId,
            notificationType: 'plan_adaptive_scaling',
            title: 'Let\'s Adjust Your Plan 🎯',
            body: `I noticed you've missed your "${plan.plan_name}" goal ${failureCount} weeks in a row. Let's scale back to ${newTarget} sessions per week to rebuild momentum. Small wins lead to big changes!`,
            scheduledFor: new Date(),
            relatedPlanId: plan.id,
            metadata: {
                old_target: target,
                new_target: newTarget,
                old_difficulty: currentDifficulty,
                new_difficulty: newDifficulty,
                reason: 'consecutive_failures'
            }
        });
    }

    /**
     * Suggest difficulty increase after sustained success
     */
    async suggestIncrease(plan, userId) {
        const target = this.extractTarget(plan);
        const currentDifficulty = plan.difficulty_level || 1.0;
        const newDifficulty = Math.min(2.0, currentDifficulty + 0.1); // 10% increase, max 2.0
        const newTarget = Math.ceil(target * 1.1);

        console.log(`[Adaptive] Suggesting increase: ${target} → ${newTarget}`);

        await NotificationModel.create({
            userId,
            notificationType: 'plan_level_up',
            title: 'Ready to Level Up? 🚀',
            body: `You've crushed your "${plan.plan_name}" goal for 3 weeks straight! Want to increase to ${newTarget} sessions per week?`,
            scheduledFor: new Date(),
            relatedPlanId: plan.id,
            metadata: {
                current_target: target,
                suggested_target: newTarget,
                current_difficulty: currentDifficulty,
                suggested_difficulty: newDifficulty,
                weeks_completed: plan.weeks_at_current_level
            }
        });
    }

    /**
     * Record weekly performance in history
     */
    async recordPerformance(planId, actual, target) {
        const record = {
            week: new Date().toISOString().split('T')[0],
            actual,
            target,
            success: actual >= target
        };

        await query(`
            UPDATE plans 
            SET performance_history = performance_history || $1::jsonb
            WHERE id = $2
        `, [JSON.stringify(record), planId]);
    }

    /**
     * Extract current target from plan
     */
    extractTarget(plan) {
        const phases = plan.plan_data?.phases || [];
        const currentWeekIdx = (plan.current_week || 1) - 1;
        const currentPhase = phases[currentWeekIdx] || phases[0];

        if (!currentPhase) return 3;

        let target = 3;
        if (currentPhase.frequency) {
            target = currentPhase.frequency;
        } else if (currentPhase.target && typeof currentPhase.target === 'number') {
            target = currentPhase.target;
        } else if (currentPhase.target && typeof currentPhase.target === 'string') {
            const match = currentPhase.target.match(/\d+/);
            if (match) target = parseInt(match[0]);
        }

        return target;
    }

    /**
     * Reset weekly progress counter
     * Should be called at the start of each week (Monday)
     */
    async resetWeeklyProgress(planId) {
        await query(`
            UPDATE plans 
            SET progress = 0,
                current_week = current_week + 1
            WHERE id = $1
        `, [planId]);

        console.log(`[Adaptive] Reset weekly progress for plan ${planId}`);
    }
}

export default new PlanAdaptiveService();
