import db from '../../db/index.js';
import NotificationModel from '../../models/notification.model.js';
import fcmService from './fcmService.js';

class BlueprintNotificationService {

    /**
     * Main Entry Point: Check all active plans and send due reminders.
     * Use robust idempotency to prevent double-sends.
     */
    async checkDueReminders() {
        const now = new Date();
        // Format current time as HH:mm (24h)
        // Note: Server time must be consistent. Assuming UTC or consistently configured local time.
        // For simple MVP, we assume server runs in user's timezone or we handle offset later.
        // Given '2026-01-17T11:15:27+05:30', we are in IST.
        // The robust way is to store/match times relative to user timezone, but for now
        // we assume the schedule string "08:00" means "08:00 system time" or we explicitly matches HM.

        const currentHour = String(now.getHours()).padStart(2, '0');
        const currentMinute = String(now.getMinutes()).padStart(2, '0');
        const currentTimeString = `${currentHour}:${currentMinute}`;

        console.log(`⏰ Checking blueprint reminders for time: ${currentTimeString}`);

        try {
            // 1. Get ALL Active Plans
            // We only care about plans that have a schedule defined in phases[0]
            const query = `
                SELECT id, user_id, plan_name, phases 
                FROM plans 
                WHERE status = 'active'
            `;
            const { rows: plans } = await db.query(query);

            let sentCount = 0;

            for (const plan of plans) {
                const phase = plan.phases?.[0];
                if (!phase || !phase.schedule || !Array.isArray(phase.schedule)) continue;

                // 2. Check if current time matches any slot in the schedule
                // Schedule format example: ["08:00", "20:00"] or ["Monday @ 10:00"]
                // We handle "HH:mm" matches first (Daily)

                const matches = phase.schedule.some(slot => {
                    // Simple "08:00" check
                    if (slot === currentTimeString) return true;

                    // "Day @ HH:mm" check (e.g. "Monday @ 14:00")
                    if (slot.includes('@')) {
                        const [day, time] = slot.split('@').map(s => s.trim());
                        const currentDayName = now.toLocaleDateString('en-US', { weekday: 'long' });
                        if (day === currentDayName && time === currentTimeString) return true;
                    }

                    return false;
                });

                if (matches) {
                    await this.processDuePlan(plan, currentTimeString);
                    sentCount++;
                }
            }

            if (sentCount > 0) {
                console.log(`✅ Processed ${sentCount} due reminders for ${currentTimeString}`);
            }

        } catch (error) {
            console.error('❌ Error checking blueprint reminders:', error);
        }
    }

    /**
     * Process a single matching plan: check duplicate -> send -> log
     */
    async processDuePlan(plan, timeString) {
        // 3. Idempotency Check
        // Have we sent a 'blueprint_reminder' for this plan_id today at this time?
        // match: related_plan_id, type, date(scheduled_for) == today, hour/min match
        // Or simpler: check if we created a notification log record in last 5 mins for this plan

        const checkQuery = `
            SELECT id FROM notifications
            WHERE related_plan_id = $1
              AND notification_type = 'blueprint_reminder'
              AND created_at > NOW() - INTERVAL '30 minutes'
              AND (metadata->>'scheduled_time') = $2
        `;

        const { rows: existing } = await db.query(checkQuery, [plan.id, timeString]);

        if (existing.length > 0) {
            // Already sent
            return;
        }

        console.log(`🚀 Sending reminder for plan: ${plan.plan_name} (${plan.user_id})`);

        // 4. Send Notification (FCM)
        const title = `Time to ${plan.plan_name}`;
        const body = `Stay consistent! Mark your progress now.`;

        try {
            const fcmResult = await fcmService.sendToUser(plan.user_id, title, body, {
                type: 'blueprint_reminder',
                planId: plan.id
            });

            // 5. Log to DB (Acts as Idempotency Record)
            await NotificationModel.create({
                userId: plan.user_id,
                notificationType: 'blueprint_reminder',
                title,
                body,
                scheduledFor: new Date(), // Now
                status: fcmResult ? 'sent' : 'failed',
                relatedPlanId: plan.id,
                metadata: {
                    scheduled_time: timeString
                }
            });

        } catch (error) {
            console.error(`Failed to send reminder for plan ${plan.id}:`, error);
        }
    }
}

export default new BlueprintNotificationService();
