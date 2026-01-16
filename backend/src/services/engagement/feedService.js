
import { query } from '../../db/index.js';

class FeedService {
    /**
     * Create a new feed item (Transient or Persistent)
     */
    async createItem(userId, { type, title, body, data = {}, expiresAt = null }) {
        const sql = `
            INSERT INTO feed_items (user_id, type, title, body, data, expires_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        const result = await query(sql, [userId, type, title, body, data, expiresAt]);
        return result.rows[0];
    }

    /**
     * Get active feed items for a user
     */
    async getFeed(userId, limit = 10) {
        const sql = `
            SELECT * FROM feed_items
            WHERE user_id = $1
            AND (expires_at IS NULL OR expires_at > NOW())
            ORDER BY created_at DESC
            LIMIT $2
        `;
        const result = await query(sql, [userId, limit]);
        return result.rows;
    }

    /**
     * Mark item as read
     */
    async markRead(itemId, userId) {
        const sql = `
            UPDATE feed_items 
            SET is_read = true 
            WHERE id = $1 AND user_id = $2
            RETURNING *
        `;
        const result = await query(sql, [itemId, userId]);
        return result.rows[0];
    }
}

export default new FeedService();
