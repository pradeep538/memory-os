import PlanModel from '../../models/plan.model.js';
import inputEnhancementService from '../../services/input/inputEnhancementService.js';

class PlansController {
    /**
     * Get active plans
     * GET /api/v1/plans
     */
    async getPlans(request, reply) {
        try {
            const userId = request.userId;
            const plans = await PlanModel.findActive(userId);
            return reply.send({ success: true, data: plans });
        } catch (error) {
            request.log.error(error);
            return reply.code(500).send({ success: false, error: error.message });
        }
    }

    /**
     * Create a new plan
     * POST /api/v1/plans
     */
    async createPlan(request, reply) {
        try {
            const userId = request.userId;
            const planData = { ...request.body, userId };

            // Basic validtion
            if (!planData.category || !planData.goal) {
                return reply.code(400).send({ success: false, error: 'Category and Goal are required' });
            }

            // Auto-Enhancement Removed: Frontend now handles interactive polish.
            // We respect whatever name/goal the frontend sends.

            // Defaults if not provided (Generator usually handles this, but safe fallback)
            if (!planData.name) planData.name = `${planData.goal} Plan`;
            if (!planData.durationWeeks) planData.durationWeeks = 4;
            if (!planData.phases) {
                // Parse schedule string into array if present
                let scheduleArray = [];
                if (planData.schedule_details) {
                    scheduleArray = planData.schedule_details.split('|');
                }

                // Default simple phase
                planData.phases = [{
                    week: 1,
                    goal: planData.goal, // Use the (potentially refined) goal
                    target: planData.frequency || 'Daily',
                    schedule: scheduleArray // Persist specific times
                }];
            }

            const newPlan = await PlanModel.create(planData);
            return reply.code(201).send({ success: true, data: newPlan });

        } catch (error) {
            request.log.error(error);
            return reply.code(500).send({ success: false, error: error.message });
        }
    }

    /**
     * Update a plan
     * PATCH /api/v1/plans/:id
     */
    async updatePlan(request, reply) {
        try {
            const userId = request.userId;
            const { id } = request.params;
            const updates = request.body;

            const updatedPlan = await PlanModel.update(id, userId, updates);

            if (!updatedPlan) {
                return reply.code(404).send({ success: false, error: 'Plan not found' });
            }

            return reply.send({ success: true, data: updatedPlan });
        } catch (error) {
            request.log.error(error);
            return reply.code(500).send({ success: false, error: error.message });
        }
    }

    /**
     * Archive a plan
     * DELETE /api/v1/plans/:id
     */
    async archivePlan(request, reply) {
        try {
            const userId = request.userId;
            const { id } = request.params;

            const archivedPlan = await PlanModel.archive(id, userId);

            if (!archivedPlan) {
                return reply.code(404).send({ success: false, error: 'Plan not found' });
            }

            return reply.send({ success: true, data: archivedPlan });
        } catch (error) {
            request.log.error(error);
            return reply.code(500).send({ success: false, error: error.message });
        }
    }
}

export default new PlansController();
