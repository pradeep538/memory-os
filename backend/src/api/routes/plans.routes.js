import planGenerator from '../../services/plans/planGenerator.js';

export default async function planRoutes(fastify, options) {
    /**
     * Generate a new plan
     */
    fastify.post('/plans/generate', async (request, reply) => {
        try {
            const userId = '00000000-0000-0000-0000-000000000000'; // TODO: Auth
            const { category, goal } = request.body;

            if (!category) {
                reply.code(400);
                return { success: false, error: 'Category is required' };
            }

            const plan = await planGenerator.generatePlan(userId, category, goal || 'build_consistency');

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
     * Get available templates
     */
    fastify.get('/plans/templates/:category', async (request, reply) => {
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
