import CategoryModule from '../base/CategoryModule.js';
import db from '../../db/index.js';
import NotificationModel from '../../models/notification.model.js';

/**
 * Routine/Maintenance Module
 * 
 * Handles recurring tasks like:
 * - Medicine/supplement tracking
 * - Plant care (watering, fertilizing)
 * - Appliance maintenance
 * - Vehicle service
 * - Any recurring maintenance activity
 * 
 * Key Features:
 * - Interval-based tracking (not fixed schedules)
 * - Automatic pattern detection
 * - Smart reminders based on user's habits
 * - Adherence tracking
 */
class RoutineModule extends CategoryModule {
    constructor() {
        super({
            category: 'routine',
            name: 'Routine & Maintenance',
            version: '1.0.0'
        });
    }

    /**
     * Process routine memory
     * Detects recurring patterns and schedules reminders
     */
    async processMemory(memoryUnit) {
        const { user_id, normalized_data } = memoryUnit;
        const activity = normalized_data.activity || normalized_data.item;

        if (!activity) {
            return { processed: false, message: 'No activity identified' };
        }

        try {
            // 1. Track last done timestamp
            await this.updateLastDone(user_id, activity, memoryUnit.id);

            // 2. Check if this is a recurring task (3+ occurrences)
            const isRecurring = await this.isRecurringTask(user_id, activity);

            if (isRecurring) {
                // 3. Calculate average interval
                const interval = await this.calculateInterval(user_id, activity);

                if (interval) {
                    // 4. Schedule next reminder
                    await this.scheduleReminder(user_id, activity, interval);

                    return {
                        processed: true,
                        recurring: true,
                        interval: Math.round(interval),
                        message: `Routine detected: every ${Math.round(interval)} days`
                    };
                }
            }

            return {
                processed: true,
                recurring: false,
                message: 'Tracked (not recurring yet)'
            };
        } catch (error) {
            console.error('Routine processing error:', error);
            return { processed: false, error: error.message };
        }
    }

    /**
     * Check if task has been done 3+ times (makes it recurring)
     */
    async isRecurringTask(userId, activity) {
        const query = `
      SELECT COUNT(*) as count
      FROM memory_units
      WHERE user_id = $1
        AND category = 'routine'
        AND (
          normalized_data->>'activity' = $2
          OR normalized_data->>'item' = $2
        )
        AND status = 'validated'
    `;

        const result = await db.query(query, [userId, activity]);
        return parseInt(result.rows[0].count) >= 3;
    }

    /**
     * Calculate average interval between occurrences
     */
    async calculateInterval(userId, activity) {
        const query = `
      SELECT created_at
      FROM memory_units
      WHERE user_id = $1
        AND category = 'routine'
        AND (
          normalized_data->>'activity' = $2
          OR normalized_data->>'item' = $2
        )
        AND status = 'validated'
      ORDER BY created_at DESC
      LIMIT 5
    `;

        const result = await db.query(query, [userId, activity]);
        const occurrences = result.rows;

        if (occurrences.length < 2) {
            return null;
        }

        // Calculate intervals between consecutive occurrences
        const intervals = [];
        for (let i = 0; i < occurrences.length - 1; i++) {
            const diff = new Date(occurrences[i].created_at) - new Date(occurrences[i + 1].created_at);
            const days = diff / (1000 * 60 * 60 * 24);
            intervals.push(days);
        }

        // Return average interval
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        return avgInterval;
    }

    /**
     * Update last done timestamp for activity
     */
    async updateLastDone(userId, activity, memoryId) {
        // Store in metadata table or use existing memory as reference
        // For now, we just use the memory_units table itself
        return true;
    }

    /**
     * Schedule reminder for next occurrence
     */
    async scheduleReminder(userId, activity, intervalDays) {
        const nextDue = new Date();
        nextDue.setDate(nextDue.getDate() + Math.round(intervalDays));

        // Cancel any existing pending reminders for this activity
        await db.query(`
      UPDATE notifications
      SET status = 'cancelled'
      WHERE user_id = $1
        AND notification_type = 'routine_reminder'
        AND metadata->>'activity' = $2
        AND status = 'pending'
    `, [userId, activity]);

        // Create new reminder
        await NotificationModel.create({
            userId,
            notificationType: 'routine_reminder',
            title: '⏰ Routine Reminder',
            body: `Time to: ${activity}`,
            scheduledFor: nextDue,
            metadata: {
                activity,
                interval_days: Math.round(intervalDays),
                category: 'routine'
            }
        });

        console.log(`  ✓ Scheduled reminder for "${activity}" in ${Math.round(intervalDays)} days`);
        return true;
    }

    /**
     * Generate routine-specific insights
     */
    async generateInsights(userId, timeRange = {}) {
        const insights = [];

        // 1. Adherence tracking
        const adherence = await this.calculateAdherence(userId, timeRange);
        if (adherence.length > 0) {
            insights.push(...adherence);
        }

        // 2. Overdue tasks
        const overdue = await this.findOverdueTasks(userId);
        if (overdue.length > 0) {
            insights.push({
                type: 'alert',
                category: 'routine',
                title: 'Overdue Routines',
                description: `${overdue.length} routine tasks are overdue`,
                data: overdue,
                priority: 'high'
            });
        }

        // 3. Streaks
        const streaks = await this.findStreaks(userId);
        if (streaks.length > 0) {
            insights.push(...streaks);
        }

        return insights;
    }

    /**
     * Calculate adherence to routines
     */
    async calculateAdherence(userId, timeRange) {
        // TODO: Implement adherence calculation
        return [];
    }

    /**
     * Find overdue tasks
     */
    async findOverdueTasks(userId) {
        const query = `
      SELECT 
        n.metadata->>'activity' as activity,
        n.scheduled_for,
        EXTRACT(DAY FROM (NOW() - n.scheduled_for)) as days_overdue
      FROM notifications n
      WHERE n.user_id = $1
        AND n.notification_type = 'routine_reminder'
        AND n.status = 'pending'
        AND n.scheduled_for < NOW()
      ORDER BY n.scheduled_for ASC
    `;

        const result = await db.query(query, [userId]);
        return result.rows.map(row => ({
            activity: row.activity,
            daysOverdue: Math.round(row.days_overdue)
        }));
    }

    /**
     * Find active streaks
     */
    async findStreaks(userId) {
        // TODO: Implement streak detection
        return [];
    }

    /**
     * Get module capabilities
     */
    getMetadata() {
        return {
            ...super.getMetadata(),
            capabilities: {
                processMemory: true,
                generateInsights: true,
                generatePlans: false,
                guidedSessions: false,
                intervalTracking: true,
                smartReminders: true
            },
            supportedActivities: [
                'medicine', 'supplement', 'vitamin',
                'water plants', 'fertilize', 'plant care',
                'clean', 'maintenance', 'service',
                'car service', 'oil change'
            ]
        };
    }
}

export default RoutineModule;
