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
                user_id, plan_name, description, duration_weeks, 
                phases, status, start_date, category, progress
            )
            VALUES ($1, $2, $3, $4, $5, 'active', NOW(), $6, 0)
            RETURNING *
        `;

        const values = [
            userId, name, description, durationWeeks,
            JSON.stringify(phases), category
        ];

        const result = await db.query(query, values);
        return result.rows[0];
    }
}

export default PlanModel;
