import db from '../db/index.js';

class PlanModel {
    /**
     * Get active plans for a user
     * Used for context-aware ingestion
     */
    static async findActive(userId) {
        // Smart Progress: Count weekly memories dynamically
        // Resets every Monday automatically via date_trunc('week', ...)
        const query = `
            SELECT p.*, 
            COALESCE((
                SELECT COUNT(*) 
                FROM memory_units m 
                WHERE m.user_id = p.user_id 
                  AND m.category = p.category 
                  AND m.created_at >= date_trunc('week', CURRENT_DATE)
                  AND m.status != 'deleted'
            ), 0)::int as dynamic_progress
            FROM plans p 
            WHERE p.user_id = $1 AND p.status = 'active'
        `;
        const result = await db.query(query, [userId]);

        // Map dynamic_progress to progress field for frontend compatibility
        return result.rows.map(row => ({
            ...row,
            progress: row.dynamic_progress // Override stored progress with live count
        }));
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
            { phases }, category
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
        // Map frontend keys to DB columns
        if (updates.name) {
            updates.plan_name = updates.name;
            delete updates.name;
        }
        if (updates.duration) {
            updates.duration_weeks = updates.duration;
            delete updates.duration;
        }

        const allowedFields = ['plan_name', 'category', 'description', 'duration_weeks']; // goal/phases are NOT columns
        const fields = [];
        const values = [];
        let idx = 1;

        // Handle phases/goal -> plan_data mapping logic
        let planDataUpdate = {};
        if (updates.phases) {
            // Unwrap phases if passed directly
            planDataUpdate.phases = updates.phases;
            delete updates.phases;
            // We'll merge this into 'plan_data' column
        }

        // Remove virtual fields that aren't columns (goal, frequency, schedule are used to build phases in controller)
        delete updates.goal;
        delete updates.frequency;
        delete updates.schedule;

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                fields.push(`${key} = $${idx}`);
                values.push(value);
                idx++;
            }
        }

        // If phases are present, we need to update plan_data
        if (planDataUpdate.phases) {
            fields.push(`plan_data = $${idx}`);
            values.push({ phases: planDataUpdate.phases }); // Wrap in object
            idx++;
        }

        if (fields.length === 0) return null;

        values.push(planId, userId);
        const query = `
            UPDATE plans 
            SET ${fields.join(', ')}, last_updated_at = NOW()
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
