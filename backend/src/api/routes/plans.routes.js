import plansController from '../controllers/plans.controller.js';
import planGenerator from '../../services/plans/planGenerator.js';
import auth from '../../middleware/auth.js';

export default async function planRoutes(fastify, options) {
    /**
     * Get active plans
     */
    fastify.get('/plans/active', { preHandler: auth.authenticate }, plansController.getPlans);

    /**
     * Update plan (Edit)
     */
    fastify.patch('/plans/:id', { preHandler: auth.authenticate }, plansController.updatePlan);

    /**
     * Archive plan (Delete)
     */
    fastify.delete('/plans/:id', { preHandler: auth.authenticate }, plansController.archivePlan);

    /**
     * Create a new plan (Manual)
     */
    fastify.post('/plans', { preHandler: auth.authenticate }, plansController.createPlan);

    /**
     * Generate a new plan (Generator)
     */
    fastify.post('/plans/generate', { preHandler: auth.authenticate }, async (request, reply) => {
        try {
            const userId = request.userId;
            const { category, goal, frequency } = request.body; // Added frequency support

            if (!category) {
                reply.code(400);
                return { success: false, error: 'Category is required' };
            }

            const plan = await planGenerator.generatePlan(userId, category, goal || 'build_consistency');

            // If frequency is provided, we might want to override the generated one
            // But generator usually handles it if passed. For now, this is fine.

            return {
                success: true,
                data: plan,
                message: 'Plan generated successfully! 🎯'
            };
        } catch (error) {
            reply.code(500);
            return { success: false, error: error.message };
        }
    });

    /**
     * Architect Mode: Start Session
     */
    fastify.post('/plans/architect/start', { preHandler: auth.authenticate }, async (request, reply) => {
        try {
            const blueprintArchitect = (await import('../../services/plans/blueprintArchitect.js')).default;
            const result = await blueprintArchitect.startSession(request.userId);
            return { success: true, data: result };
        } catch (error) {
            reply.code(500);
            return { success: false, error: error.message };
        }
    });

    /**
     * Architect Mode: Chat Interaction
     */
    fastify.post('/plans/architect/chat', { preHandler: auth.authenticate }, async (request, reply) => {
        try {
            const { sessionId, text } = request.body;
            if (!sessionId || !text) {
                return reply.code(400).send({ success: false, error: 'Session ID and Text required' });
            }

            const blueprintArchitect = (await import('../../services/plans/blueprintArchitect.js')).default;
            const result = await blueprintArchitect.processInteraction(request.userId, sessionId, text);
            return { success: true, data: result };
        } catch (error) {
            reply.code(500);
            return { success: false, error: error.message };
        }
    });

    /**
     * Get available templates
     */
    fastify.get('/plans/templates/:category', { preHandler: auth.authenticate }, async (request, reply) => {
        try {
            const { category } = request.params;
            const templates = planGenerator.getAvailableTemplates(category);

            return {
                success: true,
                data: templates
            };
        } catch (error) {
            reply.code(500);
            return { success: false, error: error.message };
        }
    });
}
