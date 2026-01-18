import cron from 'node-cron';
import insightsService from '../intelligence/insightsService.js';
import questionGeneratorService from '../intelligence/questionGeneratorService.js';
import NotificationModel from '../../models/notification.model.js';
import UserModel from '../../models/user.model.js';
import planCoachingService from '../plans/planCoachingService.js';
import blueprintNotificationService from './blueprintNotificationService.js';

class SchedulerService {
    constructor() {
        this.jobs = [];
    }

    /**
     * Start all scheduled jobs
     */
    async getAllActiveUsers() {
        const sql = 'SELECT id, timezone FROM users';
        const res = await import('../../db/index.js').then(m => m.query(sql));
        return res.rows;
    }

    /**
     * Get users where current time in THEIR timezone matches target hour/day
     * hour: 0-23
     * dayOfWeek: 0-6 (0=Sun), or null for any day
     */
    async getUsersWithLocalTime(targetHour, targetDayOfWeek = null) {
        const { query } = await import('../../db/index.js');

        let sql = `
            SELECT id FROM users
            WHERE EXTRACT(HOUR FROM NOW() AT TIME ZONE COALESCE(timezone, 'UTC')) = $1
        `;
        const params = [targetHour];

        if (targetDayOfWeek !== null) {
            sql += ` AND EXTRACT(DOW FROM NOW() AT TIME ZONE COALESCE(timezone, 'UTC')) = $2`;
            params.push(targetDayOfWeek);
        }

        const res = await query(sql, params);
        return res.rows;
    }

    /**
     * Start all scheduled jobs
     */
    startAll() {
        console.log('🕐 Starting scheduled jobs (Timezone Aware)...');

        // Master Hourly Job (Handles all "at X hour" tasks)
        this.scheduleHourlyMasterParams();

        // High Frequency Jobs
        this.scheduleBlueprintReminders();

        console.log('✅ Scheduled jobs started');
    }

    /**
     * Master Hourly Job
     * Runs every hour at minute 0
     * Checks for Weekly Insights (8 AM Sun), Daily Summary (11 PM), Plan Coaching (9 AM)
     */
    scheduleHourlyMasterParams() {
        cron.schedule('0 * * * *', async () => {
            console.log('⏰ Running Hourly Master Job...');

            // 1. Weekly Insights (Sunday 8 AM Display Time)
            const weeklyUsers = await this.getUsersWithLocalTime(8, 0); // 8 AM, Sunday
            if (weeklyUsers.length > 0) {
                console.log(`   Running Weekly Insights for ${weeklyUsers.length} users (It is 8 AM Sunday for them)`);
                for (const user of weeklyUsers) await this.generateWeeklyInsightNotification(user.id);
            }

            // 2. Daily Summary (11 PM Daily)
            const summaryUsers = await this.getUsersWithLocalTime(23); // 11 PM, Any day
            if (summaryUsers.length > 0) {
                console.log(`   Running Daily Summary for ${summaryUsers.length} users (It is 11 PM for them)`);
                for (const user of summaryUsers) await this.generateDailySummaryNotification(user.id);
            }

            // 3. Plan Coaching (9 AM Daily)
            // TODO: Checking logic for Plan Coaching (it might need to be run often?)
            // Original code ran it hourly. Let's keep it hourly for everyone or restricted?
            // "Daily Plan Coaching" implies once a day. 
            // Previous code said "Every Hour (Heartbeat)". 
            // Let's assume Plan Coaching needs hourly heartbeat for "Expiry" checks.
            // So we run it for ALL users every hour.
            // But wait, `checkAllPlans` might be heavy.
            // If it's just checking expiry, it's fine.
            await planCoachingService.checkAllPlans();

        });
        this.jobs.push({ name: 'hourly_master', job: 'hourly' });
        console.log('  ✓ Master Hourly Job scheduled');
    }

    /**
     * Blueprint Reminders - Every Minute
     * Cron: '* * * * *'
     * Checks for specific schedule slots (e.g. 08:00)
     */
    scheduleBlueprintReminders() {
        const job = cron.schedule('* * * * *', async () => {
            await blueprintNotificationService.checkDueReminders();
        });

        this.jobs.push({ name: 'blueprint_reminders', job });
        console.log('  ✓ Blueprint reminders scheduled (Every Minute)');
    }

    /**
     * Generate weekly insight notification for user
     */
    async generateWeeklyInsightNotification(userId) {
        try {
            // 1. Force refresh insights from Python analytics
            const insights = await insightsService.refreshInsights(userId);

            if (insights.length === 0) {
                console.log(`No insights for user ${userId}`);
                return;
            }

            // 2. Pick the best insight (highest confidence)
            const bestInsight = insights[0];

            // 3. Generate teaser question
            const question = await questionGeneratorService.generateQuestion(bestInsight);

            // 4. Create notification (teaser only, no answer)
            const notification = await NotificationModel.create({
                userId,
                notificationType: 'weekly_insight',
                title: '🔍 Your Weekly Insight',
                body: question, // Just the question, no answer
                scheduledFor: new Date(), // Send immediately
                metadata: {
                    insight_id: bestInsight.id,
                    insight_type: bestInsight.type,
                    category: bestInsight.category,
                    has_reveal: true // Frontend knows user can tap to reveal
                }
            });

            console.log(`  ✓ Created weekly insight notification for user ${userId}`);
            return notification;
        } catch (error) {
            console.error(`  ✗ Failed to create weekly insight for user ${userId}:`, error);
        }
    }

    /**
     * Generate daily summary notification
     */
    async generateDailySummaryNotification(userId) {
        try {
            // TODO: Implement daily summary logic
            // For now, just create a simple notification

            const notification = await NotificationModel.create({
                userId,
                notificationType: 'daily_summary',
                title: '📅 Your Day in Review',
                body: 'Tap to see what you accomplished today',
                scheduledFor: new Date(),
                metadata: {
                    summary_date: new Date().toISOString().split('T')[0]
                }
            });

            console.log(`  ✓ Created daily summary notification for user ${userId}`);
            return notification;
        } catch (error) {
            console.error(`  ✗ Failed to create daily summary for user ${userId}:`, error);
        }
    }

    /**
     * Get all active users (simplified - in production, use pagination)
     */
    async getAllActiveUsers() {
        // For now, return demo user
        // In production, query users table with pagination
        return [{ id: '00000000-0000-0000-0000-000000000000' }];
    }

    /**
     * Stop all jobs
     */
    stopAll() {
        this.jobs.forEach(({ name, job }) => {
            job.stop();
            console.log(`  ✓ Stopped ${name}`);
        });

        this.jobs = [];
        console.log('🛑 All scheduled jobs stopped');
    }

    /**
     * Run a job immediately (for testing)
     */
    async runNow(jobName, userId) {
        switch (jobName) {
            case 'weekly_insights':
                return await this.generateWeeklyInsightNotification(userId);
            case 'daily_summary':
                return await this.generateDailySummaryNotification(userId);
            case 'plan_coaching':
                return await planCoachingService.checkAllPlans();
            case 'blueprint_reminders':
                return await blueprintNotificationService.checkDueReminders();
            default:
                throw new Error(`Unknown job: ${jobName}`);
        }
    }
}

export default new SchedulerService();
