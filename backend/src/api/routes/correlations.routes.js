import correlationController from '../controllers/correlation.controller.js';

export default async function correlationRoutes(fastify, options) {
    /**
     * Get user's correlations
     */
    fastify.get('/correlations', {
        schema: {
            description: 'Get user correlations with optional filters',
            tags: ['correlations'],
            querystring: {
                type: 'object',
                properties: {
                    status: {
                        type: 'string',
                        enum: ['active', 'pinned', 'dismissed']
                    },
                    min_coefficient: { type: 'number' },
                    lag_days: { type: 'integer' }
                }
            }
        }
    }, correlationController.getUserCorrelations.bind(correlationController));

    /**
     * Get single correlation
     */
    fastify.get('/correlations/:id', {
        schema: {
            description: 'Get correlation by ID',
            tags: ['correlations'],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' }
                }
            }
        }
    }, correlationController.getCorrelation.bind(correlationController));

    /**
     * Calculate correlations
     */
    fastify.post('/correlations/calculate', {
        schema: {
            description: 'Calculate correlations for user',
            tags: ['correlations'],
            body: {
                type: 'object',
                properties: {
                    max_lag_days: { type: 'integer', default: 3 },
                    min_samples: { type: 'integer', default: 7 }
                }
            }
        }
    }, correlationController.calculateCorrelations.bind(correlationController));

    /**
     * Update correlation status
     */
    fastify.patch('/correlations/:id/status', {
        schema: {
            description: 'Update correlation status (active/pinned/dismissed)',
            tags: ['correlations'],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' }
                }
            },
            body: {
                type: 'object',
                required: ['status'],
                properties: {
                    status: {
                        type: 'string',
                        enum: ['active', 'pinned', 'dismissed']
                    }
                }
            }
        }
    }, correlationController.updateStatus.bind(correlationController));

    /**
     * Submit feedback
     */
    fastify.post('/correlations/:id/feedback', {
        schema: {
            description: 'Submit feedback for correlation',
            tags: ['correlations'],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' }
                }
            },
            body: {
                type: 'object',
                required: ['is_helpful'],
                properties: {
                    is_helpful: { type: 'boolean' },
                    comment: { type: 'string' }
                }
            }
        }
    }, correlationController.submitFeedback.bind(correlationController));

    /**
     * Get correlation statistics
     */
    fastify.get('/correlations/stats', {
        schema: {
            description: 'Get correlation statistics',
            tags: ['correlations']
        }
    }, correlationController.getStats.bind(correlationController));

    /**
     * Get available metrics
     */
    fastify.get('/correlations/metrics', {
        schema: {
            description: 'Get available metrics for correlation analysis',
            tags: ['correlations'],
            querystring: {
                type: 'object',
                properties: {
                    category: { type: 'string' }
                }
            }
        }
    }, correlationController.getMetrics.bind(correlationController));
}
