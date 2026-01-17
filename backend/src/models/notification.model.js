import db from '../db/index.js';
import fcmService from '../services/notifications/fcmService.js';

class NotificationModel {
  /**
   * Create a notification
   */
  static async create(notificationData) {
    const {
      userId,
      notificationType,
      title,
      body,
      scheduledFor,
      relatedMemoryId,
      relatedPlanId,
      metadata
    } = notificationData;

    const query = `
      INSERT INTO notifications (
        user_id, notification_type, title, body,
        scheduled_for, related_memory_id, related_plan_id, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await db.query(query, [
      userId,
      notificationType,
      title,
      body,
      scheduledFor,
      relatedMemoryId || null,
      relatedPlanId || null,
      metadata || {}
    ]);

    const notification = result.rows[0];

    // If scheduled for now (or already passed), trigger FCM immediately
    const now = new Date();
    const schedTime = new Date(scheduledFor);

    if (schedTime <= now) {
      // FIRE AND FORGET: Don't await push in the main flow to avoid latency
      fcmService.sendPushToUser(userId, title, body, {
        notification_id: notification.id,
        type: notificationType,
        ...metadata
      }).then(resp => {
        if (resp && resp.success) {
          this.markAsSent(notification.id);
        }
      }).catch(err => {
        console.error(`[NotificationModel] Push failed for ${notification.id}:`, err);
      });
    }

    return notification;
  }

  /**
   * Get pending notifications
   */
  static async getPending(limit = 100) {
    const query = `
      SELECT * FROM notifications
      WHERE status = 'pending'
        AND scheduled_for <= NOW()
      ORDER BY scheduled_for ASC
      LIMIT $1
    `;

    const result = await db.query(query, [limit]);
    return result.rows;
  }

  /**
   * Mark notification as sent
   */
  static async markAsSent(id) {
    const query = `
      UPDATE notifications
      SET status = 'sent', sent_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Get user's recent notifications
   */
  static async getRecentByUser(userId, limit = 20) {
    const query = `
      SELECT * FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

    const result = await db.query(query, [userId, limit]);
    return result.rows;
  }

  /**
   * Cancel pending notification
   */
  static async cancel(id) {
    const query = `
      UPDATE notifications
      SET status = 'cancelled'
      WHERE id = $1 AND status = 'pending'
      RETURNING *
    `;

    const result = await db.query(query, [id]);
    return result.rows[0];
  }
}

export default NotificationModel;
