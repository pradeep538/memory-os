
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
     * Get user's timezone
     */
    async getUserTimezone(userId) {
        const sql = 'SELECT timezone FROM users WHERE id = $1';
        const result = await query(sql, [userId]);
        return result.rows[0]?.timezone || 'UTC';
    }

    /**
     * Get recent insights for LLM context (Novelty Check)
     */
    async getRecentInsights(userId, limit = 5) {
        const sql = `
            SELECT title, body, created_at 
            FROM feed_items 
            WHERE user_id = $1 
            AND (type = 'pattern' OR type = 'insight')
            ORDER BY created_at DESC
            LIMIT $2
        `;
        const result = await query(sql, [userId, limit]);
        return result.rows.map(r => `[${r.created_at.toISOString().split('T')[0]}] ${r.title}: ${r.body}`).join('\n');
    }

    /**
     * Get active feed items for a user
     */
    async getFeed(userId, limit = 10) {
        const sql = `
            SELECT * FROM feed_items
            WHERE user_id = $1
            AND is_read = false
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

    /**
     * Check if a pattern feed item already exists for this pattern ID
     */
    async checkPatternExists(userId, patternId) {
        const sql = `
            SELECT id FROM feed_items 
            WHERE user_id = $1 
            AND type = 'pattern'
            AND data->>'pattern_id' = $2
            AND (expires_at IS NULL OR expires_at > NOW())
        `;
        const result = await query(sql, [userId, patternId]);
        return result.rows.length > 0;
    }

    /**
     * Update or Create a pattern feed item
     * Deduplicates based on User + Category + PatternType name
     */
    async upsertPatternItem(userId, { type, title, body, data = {}, expiresAt = null }) {
        // Try to find existing equivalent pattern
        // We assume data contains { pattern_type, category }
        const pType = data.pattern_type;
        const category = data.category;

        // SQL to check existence based on semantic content
        const checkSql = `
            SELECT * FROM feed_items 
            WHERE user_id = $1 
            AND (type = 'pattern' OR type = 'insight')
            AND data->>'pattern_type' = $2
            AND data->>'category' = $3
            LIMIT 1
        `;

        // Only run smart dedupe if we have the metadata
        if (pType && category) {
            const existing = await query(checkSql, [userId, pType, category]);
            if (existing.rows.length > 0) {
                const row = existing.rows[0];

                // Smart Resurface Logic:
                // If item is dismissed (is_read=true), only bring it back if 24h have passed since last update.
                // Otherwise, keep it hidden (respect user's dismissal for the day).
                let shouldResurface = false;
                if (row.is_read) {
                    const lastUpdate = new Date(row.updated_at);
                    const now = new Date();
                    const hoursDiff = (now - lastUpdate) / (1000 * 60 * 60);
                    if (hoursDiff >= 24) {
                        shouldResurface = true;
                    }
                } else {
                    // If already visible, keep it visible
                    shouldResurface = true;
                }

                // Update existing
                const updateSql = `
                    UPDATE feed_items
                    SET title = $1, body = $2, data = $3, expires_at = $4, created_at = NOW(), updated_at = NOW(), is_read = $6
                    WHERE id = $5
                    RETURNING *
                `;
                const res = await query(updateSql, [title, body, data, expiresAt, row.id, !shouldResurface]);
                return res.rows[0];
            }
        }

        // Fallback to Create
        return await this.createItem(userId, { type, title, body, data, expiresAt });
    }
}

export default new FeedService();
