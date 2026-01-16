import { query } from '../../db/index.js';

class PlanProgressService {
    /**
     * Update plan progress based on new memory
     * @param {Object} memory - The new memory object
     */
    async updateProgress(memory) {
        const { userId, category, eventType } = memory;

        console.log(`[PlanProgress] Checking updates for user ${userId} in category ${category}`);

        // 1. Find active plans for this user and category
        // TODO: Could also match by 'goal' keywords vs memory content if needed
        const activePlans = await query(`
            SELECT * FROM plans 
            WHERE user_id = $1 
              AND category = $2 
              AND status = 'active'
        `, [userId, category]);

        if (activePlans.length === 0) {
            console.log('[PlanProgress] No active plans found.');
            return;
        }

        // 2. Update progress for each relevant plan
        for (const plan of activePlans) {
            // Check if memory matches plan goal (heuristic)
            // For MVP, if categories match, we count it as progress towards the weekly goal (frequency)

            // Get current phase info (simplified)
            // In a real system, we'd parse 'plan.plan_data.phases' which is a JSONB array.
            // But we don't have easy JSON access inside the Loop without parsing. 
            // We'll trust the plan object from PG (node-postgres parses JSONB automatically).

            const phases = plan.plan_data.phases || [];
            const currentWeekIdx = (plan.current_week || 1) - 1;
            const currentPhase = phases[currentWeekIdx] || phases[0];

            if (!currentPhase) continue;

            // TODO: Match specific 'target' (e.g. 'run') vs memory.rawInput
            // For now, assume category match is sufficient for progress.

            const newProgress = (plan.progress || 0) + 1;

            // Update DB
            await query(`
                UPDATE plans 
                SET progress = $1, 
                    last_updated_at = NOW()
                WHERE id = $2
            `, [newProgress, plan.id]);

            console.log(`[PlanProgress] Updated plan "${plan.plan_name}" progress to ${newProgress}`);

            // Check if goal reached (Optional for MVP notification)
            // if (newProgress >= currentPhase.frequency) ...
        }
    }
}

export default new PlanProgressService();
