import notificationsController from '../controllers/notifications.controller.js';
import auth from '../../middleware/auth.js';

/**
 * Notifications routes plugin
 * Prefix: /api/v1/notifications
 */
async function notificationsRoutes(fastify, options) {
    // Get user's notifications
    fastify.get('/', {
        preHandler: auth.authenticate,
        schema: {
            description: 'Get user notifications',
            tags: ['notifications'],
            querystring: {
                type: 'object',
                properties: {
                    limit: { type: 'integer', default: 20 }
                }
            }
        }
    }, notificationsController.getNotifications.bind(notificationsController));

    // Reveal insight (when user taps notification)
    fastify.get('/:id/reveal', {
        preHandler: auth.authenticate,
        schema: {
            description: 'Reveal the insight behind a notification',
            tags: ['notifications'],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' }
                }
            }
        }
    }, notificationsController.revealInsight.bind(notificationsController));

    // Trigger job manually (for testing)
    fastify.post('/trigger/:jobName', {
        preHandler: auth.authenticate,
        schema: {
            description: 'Manually trigger a scheduled job (testing only)',
            tags: ['notifications', 'testing'],
            params: {
                type: 'object',
                properties: {
                    jobName: {
                        type: 'string',
                        enum: ['weekly_insights', 'daily_summary']
                    }
                }
            }
        }
    }, notificationsController.triggerJob.bind(notificationsController));
}

export default notificationsRoutes;
