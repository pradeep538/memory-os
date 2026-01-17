import { query } from '../../db/index.js';
import NotificationModel from '../../models/notification.model.js';
import config from '../../config/index.js';
import planAdaptiveService from './planAdaptiveService.js';

class PlanCoachingService {
    /**
     * Run hourly coaching checks for all users
     */
    async checkAllPlans() {
        console.log('🛡️ Running Hourly Plan Coaching Check...');

        try {
            // Fetch all active plans
            const result = await query(`
                SELECT * FROM plans 
                WHERE status = 'active'
            `);

            const plans = result.rows;
            // distinct users logic omitted for MVP brevity

            for (const plan of plans) {
                await this.checkPlanHealth(plan);
            }

        } catch (error) {
            console.error('[PlanCoaching] Error running check:', error);
        }
    }

    /**
     * Check individual plan health and nudge if needed
     */
    async checkPlanHealth(plan) {
        const userId = plan.user_id;
        const now = new Date();

        // 1. Weekly Assessment (Sunday 8 PM) - Adaptive Scaling
        if (now.getDay() === 0 && now.getHours() === 20) {
            await planAdaptiveService.assessWeeklyPerformance(plan);
            return; // Don't do other checks if we just did weekly assessment
        }

        // 2. Weekly Reset (Monday 12 AM)
        if (now.getDay() === 1 && now.getHours() === 0) {
            await planAdaptiveService.resetWeeklyProgress(plan.id);
            return;
        }

        // 3. Intraday Check (High-Precision / Time-Sensitive)
        await this.checkIntradayProgress(userId, plan, now);

        // 4. Stagnation Check (Configurable)
        const lastUpdate = new Date(plan.last_updated_at || plan.created_at);
        const diffDays = (now - lastUpdate) / (1000 * 60 * 60 * 24); // Float days
        const threshold = config.stagnationThresholdDays;

        if (diffDays >= threshold) {
            // Only notify roughly at 9 AM to avoid spamming every hour
            if (now.getHours() === 9) {
                // TODO: In production, check if we already sent a notification today
                // For MVP, we presume the scheduler runs once per hour, so this hits once.
                await this.sendNudge(userId, plan, 'stagnation');
                return;
            }
        }
    }

    /**
     * Check if user is on track for the current day
     * For plans with > 1 frequency per day
     */
    async checkIntradayProgress(userId, plan, now) {
        const phases = plan.plan_data.phases || [];
        const currentWeekIdx = (plan.current_week || 1) - 1;
        const currentPhase = phases[currentWeekIdx] || phases[0];

        if (!currentPhase || !currentPhase.frequency) return;

        // Only logic for daily/multi-daily plans
        // We look for frequency relative to "per day" or "sessions" in a weekly target
        // For medication example: 3x/day = 21/week.
        const weeklyTarget = currentPhase.frequency;
        if (weeklyTarget < 7) return; // Not high enough frequency for hourly nudges yet

        const dailyGoal = Math.round(weeklyTarget / 7);
        if (dailyGoal < 2) return; // Only nudge intraday if >= 2x per day

        // Current daily progress (rough estimate from weekly progress for MVP)
        // In production, we'd query: SELECT count(*) FROM metrics WHERE plan_id = X AND date = Today
        // For simplicity, we check specific "Deadlines"
        const hour = now.getHours();

        // Deadlines: 
        // 2 PM (should have 1/3 if goal is 3)
        // 6 PM (should have 2/3)
        // 10 PM (should have 3/3)

        let shouldNudge = false;
        let milestone = "";

        if (hour === 14 && plan.progress % dailyGoal === 0) { // Missed first dose
            shouldNudge = true;
            milestone = "afternoon update";
        } else if (hour === 18 && plan.progress % dailyGoal < 2) {
            shouldNudge = true;
            milestone = "evening check-in";
        }

        if (shouldNudge) {
            console.log(`[PlanCoaching] Intraday Nudge for ${plan.plan_name} at ${hour}:00`);
            await NotificationModel.create({
                userId,
                notificationType: 'coach_nudge',
                title: `${plan.plan_name} Reminder 💊`,
                body: `Just a quick ${milestone} for your plan: "${plan.plan_name}". Keep that streak alive!`,
                scheduledFor: new Date(),
                relatedPlanId: plan.id,
                metadata: {
                    nudge_type: 'intraday',
                    hour: hour
                }
            });
        }
    }


    /**
     * Check weekly goal status
     */
    async checkWeeklyGoal(userId, plan) {
        const phases = plan.plan_data.phases || [];
        const currentWeekIdx = (plan.current_week || 1) - 1;
        const currentPhase = phases[currentWeekIdx] || phases[0];

        if (!currentPhase) return;

        let target = 3;
        if (currentPhase.frequency) target = currentPhase.frequency;
        else if (currentPhase.target && typeof currentPhase.target === 'number') target = currentPhase.target;
        else if (currentPhase.target && typeof currentPhase.target === 'string') {
            const match = currentPhase.target.match(/\d+/);
            if (match) target = parseInt(match[0]);
        }

        if (plan.progress < target) {
            await this.sendNudge(userId, plan, 'missed_goal');
        }
    }

    /**
     * Send coaching notification
     */
    async sendNudge(userId, plan, type) {
        let title = 'Plan Reminder';
        let body = `Check on your plan.`;

        if (type === 'stagnation') {
            title = `Update: ${plan.plan_name} 📉`;
            body = `You haven't logged any progress for "${plan.plan_name}" in a few days. Everything okay?`;
        } else if (type === 'missed_goal') {
            title = 'Weekly Review 🗓️';
            body = `You missed your goal for "${plan.plan_name}" last week. Let's crush it this week!`;
        }

        console.log(`[PlanCoaching] Sending Nudge to user ${userId}: ${body}`);

        await NotificationModel.create({
            userId,
            notificationType: 'coach_nudge',
            title,
            body,
            scheduledFor: new Date(),
            relatedPlanId: plan.id,
            metadata: {
                nudge_type: type,
                plan_name: plan.plan_name
            }
        });
    }
}

export default new PlanCoachingService();
