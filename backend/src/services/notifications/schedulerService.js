import cron from 'node-cron';
import insightsService from '../intelligence/insightsService.js';
import questionGeneratorService from '../intelligence/questionGeneratorService.js';
import NotificationModel from '../../models/notification.model.js';
import UserModel from '../../models/user.model.js';
import planCoachingService from '../plans/planCoachingService.js';

class SchedulerService {
    constructor() {
        this.jobs = [];
    }

    /**
     * Start all scheduled jobs
     */
    startAll() {
        console.log('🕐 Starting scheduled jobs...');

        // Weekly insight generation - Every Sunday at 8 AM
        this.scheduleWeeklyInsights();

        // Daily summary - Every day at 11 PM
        this.scheduleDailySummary();

        // Daily Plan Coaching - Every day at 9 AM
        this.schedulePlanCoaching();

        console.log('✅ Scheduled jobs started');
    }

    /**
     * Weekly Insights - Every Sunday at 8:00 AM
     * Cron: '0 8 * * 0'
     */
    scheduleWeeklyInsights() {
        const job = cron.schedule('0 8 * * 0', async () => {
            console.log('📊 Running weekly insights generation...');

            try {
                // Get all users (in production, batch this)
                const users = await this.getAllActiveUsers();

                for (const user of users) {
                    await this.generateWeeklyInsightNotification(user.id);
                }

                console.log(`✅ Weekly insights generated for ${users.length} users`);
            } catch (error) {
                console.error('❌ Weekly insights job failed:', error);
            }
        });

        this.jobs.push({ name: 'weekly_insights', job });
        console.log('  ✓ Weekly insights scheduled (Sundays 8 AM)');
    }

    /**
     * Daily Summary - Every day at 11:00 PM
     * Cron: '0 23 * * *'
     */
    scheduleDailySummary() {
        const job = cron.schedule('0 23 * * *', async () => {
            console.log('📝 Running daily summary generation...');

            try {
                const users = await this.getAllActiveUsers();

                for (const user of users) {
                    await this.generateDailySummaryNotification(user.id);
                }

                console.log(`✅ Daily summaries generated for ${users.length} users`);
            } catch (error) {
                console.error('❌ Daily summary job failed:', error);
            }
        });

        this.jobs.push({ name: 'daily_summary', job });
        console.log('  ✓ Daily summary scheduled (11 PM)');
    }

    /**
     * Plan Coaching - Every Hour (Heartbeat)
     * Cron: '0 * * * *'
     */
    schedulePlanCoaching() {
        // Run every hour at minute 0
        const job = cron.schedule('0 * * * *', async () => {
            await planCoachingService.checkAllPlans();
        });

        this.jobs.push({ name: 'plan_coaching', job });
        console.log('  ✓ Plan coaching scheduled (Hourly Heartbeat)');
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
            default:
                throw new Error(`Unknown job: ${jobName}`);
        }
    }
}

export default new SchedulerService();
