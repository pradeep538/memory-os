import db from '../db/index.js';

class UserModel {
    /**
     * Find user by ID
     */
    static async findById(id) {
        const query = 'SELECT * FROM users WHERE id = $1';
        const result = await db.query(query, [id]);
        return result.rows[0];
    }

    /**
     * Find user by Firebase UID
     */
    static async findByFirebaseUid(firebaseUid) {
        const query = 'SELECT * FROM users WHERE firebase_uid = $1';
        const result = await db.query(query, [firebaseUid]);
        return result.rows[0];
    }

    /**
     * Create new user
     */
    static async create(userData) {
        const { username, email, subscriptionTier, firebaseUid } = userData;

        const query = `
      INSERT INTO users (username, email, subscription_tier, firebase_uid)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

        const values = [
            username || `user_${Date.now()}`, // Fallback username
            email,
            subscriptionTier || 'free',
            firebaseUid
        ];

        const result = await db.query(query, values);
        return result.rows[0];
    }

    /**
     * Update active categories
     */
    static async updateActiveCategories(userId, categories) {
        const query = `
      UPDATE users
      SET active_categories = $1
      WHERE id = $2
      RETURNING *
    `;
        const result = await db.query(query, [categories, userId]);
        return result.rows[0];
    }

    /**
     * Get usage stats for limits
     */
    static async getUsageStats(userId, metric, period = 'daily') {
        const now = new Date();
        const periodStart = period === 'daily'
            ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
            : new Date(now.getFullYear(), now.getMonth(), 1);

        const query = `
      SELECT count FROM usage_tracking
      WHERE user_id = $1 
        AND metric = $2
        AND period = $3
        AND period_start = $4
    `;

        const result = await db.query(query, [userId, metric, period, periodStart]);
        return result.rows[0]?.count || 0;
    }

    /**
     * Increment usage counter
     */
    static async incrementUsage(userId, metric, period = 'daily') {
        const now = new Date();
        const periodStart = period === 'daily'
            ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
            : new Date(now.getFullYear(), now.getMonth(), 1);

        const periodEnd = period === 'daily'
            ? new Date(periodStart.getTime() + 24 * 60 * 60 * 1000)
            : new Date(now.getFullYear(), now.getMonth() + 1, 1);

        const query = `
      INSERT INTO usage_tracking (user_id, metric, count, period, period_start, period_end)
      VALUES ($1, $2, 1, $3, $4, $5)
      ON CONFLICT (user_id, metric, period, period_start)
      DO UPDATE SET count = usage_tracking.count + 1
      RETURNING count
    `;

        const result = await db.query(query, [userId, metric, period, periodStart, periodEnd]);
        return result.rows[0].count;
    }
}

export default UserModel;
