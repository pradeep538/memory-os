import engagementController from '../controllers/engagement.controller.js';

export default async function engagementRoutes(fastify, options) {
    /**
     * Get user engagement data
     */
    fastify.get('/engagement', {
        schema: {
            description: 'Get user engagement data',
            tags: ['engagement']
        }
    }, engagementController.getEngagement.bind(engagementController));

    /**
     * Get engagement summary with analytics
     */
    fastify.get('/engagement/summary', {
        schema: {
            description: 'Get comprehensive engagement summary',
            tags: ['engagement']
        }
    }, engagementController.getEngagementSummary.bind(engagementController));

    /**
     * Get engagement analytics
     */
    fastify.get('/engagement/analytics', {
        schema: {
            description: 'Get engagement analytics for specified period',
            tags: ['engagement'],
            querystring: {
                type: 'object',
                properties: {
                    days: { type: 'integer', default: 30 }
                }
            }
        }
    }, engagementController.getAnalytics.bind(engagementController));

    /**
     * Get streak history
     */
    fastify.get('/engagement/streaks', {
        schema: {
            description: 'Get streak history and activity calendar',
            tags: ['engagement']
        }
    }, engagementController.getStreaks.bind(engagementController));

    /**
     * Get milestones
     */
    fastify.get('/engagement/milestones', {
        schema: {
            description: 'Get achieved and upcoming milestones',
            tags: ['engagement']
        }
    }, engagementController.getMilestones.bind(engagementController));

    /**
     * Get leaderboard
     */
    fastify.get('/engagement/leaderboard', {
        schema: {
            description: 'Get engagement leaderboard',
            tags: ['engagement'],
            querystring: {
                type: 'object',
                properties: {
                    limit: { type: 'integer', default: 10 }
                }
            }
        }
    }, engagementController.getLeaderboard.bind(engagementController));

    /**
     * Refresh engagement score
     */
    fastify.post('/engagement/refresh', {
        schema: {
            description: 'Recalculate and update engagement score',
            tags: ['engagement']
        }
    }, engagementController.refreshScore.bind(engagementController));

    /**
     * Get at-risk users (admin)
     */
    fastify.get('/engagement/at-risk', {
        schema: {
            description: 'Get users at risk of dropping off',
            tags: ['engagement'],
            querystring: {
                type: 'object',
                properties: {
                    threshold: { type: 'integer', default: 30 }
                }
            }
        }
    }, engagementController.getAtRiskUsers.bind(engagementController));
}
