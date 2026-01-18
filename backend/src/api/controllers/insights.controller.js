import insightsService from '../../services/intelligence/insightsService.js';

class InsightsController {
    /**
     * Get all insights for user
     * GET /api/v1/insights
     */
    async getInsights(request, reply) {
        try {
            const { refresh } = request.query;


            const userId = request.userId;
            console.log(`🔍 [InsightsController] Fetching for userId: ${userId}`);

            // Check if user exists in DB
            try {
                const userCheck = await (await import('../../db/index.js')).query("SELECT id FROM users WHERE id = $1", [userId]);
                console.log(`👤 [InsightsController] User found in DB: ${userCheck.rows.length > 0}`);
            } catch (err) {
                console.error(`❌ [InsightsController] DB Check error:`, err.message);
            }

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


            const userId = request.userId;

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

            const userId = request.userId;

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

    /**
     * Get patterns for user
     * GET /api/v1/insights/patterns
     */
    async getPatterns(request, reply) {
        try {

            const userId = request.userId;

            const patterns = await insightsService.getPatterns(userId);

            reply.send({
                success: true,
                data: patterns,
                count: patterns.length
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
