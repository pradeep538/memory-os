import insightsController from '../controllers/insights.controller.js';

/**
 * Insights routes plugin
 * Prefix: /api/v1/insights
 */
async function insightsRoutes(fastify, options) {
    // Get all insights
    fastify.get('/', {
        schema: {
            description: 'Get all user insights (Python patterns + LLM natural language)',
            tags: ['insights'],
            querystring: {
                type: 'object',
                properties: {
                    refresh: {
                        type: 'string',
                        enum: ['true', 'false'],
                        description: 'Force refresh from analytics (bypass cache)'
                    }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: { type: 'array' },
                        count: { type: 'integer' },
                        cached: { type: 'boolean' }
                    }
                }
            }
        }
    }, insightsController.getInsights.bind(insightsController));

    // Get category-specific insights
    fastify.get('/category/:category', {
        schema: {
            description: 'Get insights for a specific category',
            tags: ['insights'],
            params: {
                type: 'object',
                properties: {
                    category: {
                        type: 'string',
                        enum: ['fitness', 'finance', 'mindfulness', 'routine', 'health', 'generic']
                    }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: { type: 'array' },
                        count: { type: 'integer' },
                        category: { type: 'string' }
                    }
                }
            }
        }
    }, insightsController.getCategoryInsights.bind(insightsController));

    // Force refresh insights
    fastify.post('/refresh', {
        schema: {
            description: 'Force refresh insights from analytics service',
            tags: ['insights'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: { type: 'array' },
                        count: { type: 'integer' },
                        message: { type: 'string' }
                    }
                }
            }
        }
    }, insightsController.refreshInsights.bind(insightsController));

    // Get patterns
    fastify.get('/patterns', {
        schema: {
            description: 'Get detected patterns for user',
            tags: ['insights'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: { type: 'array' },
                        count: { type: 'integer' }
                    }
                }
            }
        }
    }, insightsController.getPatterns.bind(insightsController));
}

export default insightsRoutes;
