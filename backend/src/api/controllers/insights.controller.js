import insightsService from '../../services/intelligence/insightsService.js';

class InsightsController {
    /**
     * Get all insights for user
     * GET /api/v1/insights
     */
    async getInsights(request, reply) {
        try {
            const { refresh } = request.query;

            // TODO: Get userId from auth
            const userId = '00000000-0000-0000-0000-000000000000';

            const insights = refresh === 'true'
                ? await insightsService.refreshInsights(userId)
                : await insightsService.getUserInsights(userId);

            reply.send({
                success: true,
                data: insights,
                count: insights.length,
                cached: insights.some(i => !i.isNew)
            });
        } catch (error) {
            request.log.error(error);
            reply.code(500).send({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get insights for specific category
     * GET /api/v1/insights/category/:category
     */
    async getCategoryInsights(request, reply) {
        try {
            const { category } = request.params;

            // TODO: Get userId from auth
            const userId = '00000000-0000-0000-0000-000000000000';

            const insights = await insightsService.getCategoryInsights(userId, category);

            reply.send({
                success: true,
                data: insights,
                count: insights.length,
                category
            });
        } catch (error) {
            request.log.error(error);
            reply.code(500).send({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Force refresh insights (bypass cache)
     * POST /api/v1/insights/refresh
     */
    async refreshInsights(request, reply) {
        try {
            // TODO: Get userId from auth
            const userId = '00000000-0000-0000-0000-000000000000';

            const insights = await insightsService.refreshInsights(userId);

            reply.send({
                success: true,
                data: insights,
                count: insights.length,
                message: 'Insights refreshed from analytics'
            });
        } catch (error) {
            request.log.error(error);
            reply.code(500).send({
                success: false,
                error: error.message
            });
        }
    }
}

export default new InsightsController();
