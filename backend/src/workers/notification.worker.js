/**
 * Notification Worker
 * Scheduled to run every 15 minutes
 * Checks for routines due at current time and sends notifications
 */

import { query } from '../db/index.js';

// Queue configuration
export const QUEUE_NAME = 'notification';
// Run every 15 minutes
export const SCHEDULE = '*/15 * * * *';

export default async function notificationWorker() {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // "08:00"
    const currentDay = now.getDay() || 7; // 1-7 (1=Monday, 7=Sunday)

    console.log(`[Notification Worker] Checking routines for ${currentTime} on day ${currentDay}`);

    try {
        // Find routines scheduled for this time
        const { rows: scheduled } = await query(`
      SELECT 
        rs.id,
        rs.user_id,
        rs.routine_name,
        rs.routine_type,
        rs.notification_title,
        rs.notification_body,
        rs.last_notification_sent,
        u.firebase_uid,
        u.email
      FROM routine_schedules rs
      JOIN users u ON u.id = rs.user_id
      WHERE rs.notification_enabled = true
        AND $1 = ANY(rs.schedule_times::TEXT[])
        AND $2 = ANY(rs.schedule_days)
    `, [currentTime, currentDay]);

        console.log(`[Notification Worker] Found ${scheduled.length} scheduled routines`);

        for (const routine of scheduled) {
            // Check if already notified today
            if (routine.last_notification_sent) {
                const lastSent = new Date(routine.last_notification_sent);
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                if (lastSent >= today) {
                    console.log(`[Notification Worker] Already notified for ${routine.routine_name} today`);
                    continue;
                }
            }

            // Check if already completed today
            const completed = await checkCompletedToday(routine.user_id, routine.routine_name);

            if (completed) {
                console.log(`[Notification Worker] ${routine.routine_name} already completed today`);
                continue;
            }

            // Send notification
            await sendNotification(routine);

            // Update last sent timestamp
            await query(`
        UPDATE routine_schedules 
        SET last_notification_sent = NOW(),
            updated_at = NOW()
        WHERE id = ?
      `, [routine.id]);

            console.log(`[Notification Worker] ✓ Sent notification for ${routine.routine_name}`);
        }

    } catch (error) {
        console.error('[Notification Worker] Error:', error);
    }
}

/**
 * Check if routine was completed today
 */
async function checkCompletedToday(userId, routineName) {
    const result = await query(`
    SELECT EXISTS(
      SELECT 1 FROM memory_units
      WHERE user_id = ?
        AND raw_input ILIKE ?
        AND DATE(created_at) = DATE('now')
    ) as completed
  `, [userId, `%${routineName}%`]);

    return result[0].completed;
}

/**
 * Send push notification
 * TODO: Integrate with FCM or other push service
 */
async function sendNotification(routine) {
    const notification = {
        userId: routine.user_id,
        title: routine.notification_title || `${routine.routine_name} reminder`,
        body: routine.notification_body || `Time for ${routine.routine_name}`,
        data: {
            type: 'routine_reminder',
            routine_id: routine.id,
            routine_name: routine.routine_name,
            routine_type: routine.routine_type
        }
    };

    // TODO: Implement actual push notification
    // For now, just log
    console.log(`[Notification] ${notification.title}: ${notification.body}`);

    // In production, use FCM:
    // await fcm.send({
    //   token: routine.fcm_token,
    //   notification: {
    //     title: notification.title,
    //     body: notification.body
    //   },
    //   data: notification.data
    // });
}
