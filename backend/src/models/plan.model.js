import db from '../db/index.js';

class PlanModel {
    /**
     * Get active plans for a user
     * Used for context-aware ingestion
     */
    static async findActive(userId) {
        const query = `
            SELECT * FROM plans 
            WHERE user_id = $1 AND status = 'active'
        `;
        const result = await db.query(query, [userId]);
        return result.rows;
    }

    /**
     * Update plan progress
     * @param {string} planId
     * @param {number} value - Value to increment by (default 1)
     * @param {string} unit - Unit of measurement (optional)
     * @param {string} lastLogId - ID of the memory that triggered this update
     */
    static async updateProgress(planId, value = 1, unit = null, lastLogId = null) {
        // First get current plan to check phases
        const planRes = await db.query('SELECT * FROM plans WHERE id = $1', [planId]);
        if (planRes.rows.length === 0) return null;

        const plan = planRes.rows[0];

        // Simple increment for now - in future we can do complex phase logic
        // We update the 'progress' field. 
        // Note: The schema might store progress as a simple integer or JSON. 
        // Based on seed script, 'progress' is an integer.

        const query = `
            UPDATE plans 
            SET 
                progress = progress + $1,
                last_updated_at = NOW()
            WHERE id = $2
            RETURNING *
        `;

        const result = await db.query(query, [value, planId]);
        return result.rows[0];
    }

    /**
     * Create a new plan (wrapper likely used by generator)
     */
    static async create(planData) {
        const { userId, name, description, durationWeeks, phases, category, goal } = planData;

        const query = `
            INSERT INTO plans (
                user_id, plan_name, duration_weeks, 
                plan_data, status, category, progress
            )
            VALUES ($1, $2, $3, $4, 'active', $5, 0)
            RETURNING *
        `;

        const values = [
            userId, name, durationWeeks,
            phases, category
        ];

        const result = await db.query(query, values);
        return result.rows[0];
    }

    /**
     * Archive a plan (Soft Delete)
     * @param {string} planId 
     * @param {string} userId 
     */
    static async archive(planId, userId) {
        const query = `
            UPDATE plans 
            SET status = 'archived'
            WHERE id = $1 AND user_id = $2
            RETURNING *
        `;
        const result = await db.query(query, [planId, userId]);
        return result.rows[0];
    }

    /**
     * Update plan details (Edit)
     * @param {string} planId 
     * @param {string} userId 
     * @param {object} updates - { plan_name, goal, etc. }
     */
    static async update(planId, userId, updates) {
        const allowedFields = ['plan_name', 'category', 'description'];
        const fields = [];
        const values = [];
        let idx = 1;

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                fields.push(`${key} = $${idx}`);
                values.push(value);
                idx++;
            }
        }

        if (fields.length === 0) return null;

        values.push(planId, userId);
        const query = `
            UPDATE plans 
            SET ${fields.join(', ')}
            WHERE id = $${idx} AND user_id = $${idx + 1}
            RETURNING *
        `;

        const result = await db.query(query, values);
        return result.rows[0];
    }

    /**
     * Check for and expire plans that have passed their duration.
     * Transitions status from 'active' -> 'completed'.
     * Should be called by a daily cron job.
     */
    static async checkExpirations() {
        const query = `
            UPDATE plans 
            SET status = 'completed'
            WHERE status = 'active' 
              AND duration_weeks < 52 -- Ignore "Ongoing" plans
              AND (created_at + (duration_weeks || ' weeks')::interval) < NOW()
            RETURNING *
        `;
        const result = await db.query(query);
        return result.rows;
    }
}

export default PlanModel;
