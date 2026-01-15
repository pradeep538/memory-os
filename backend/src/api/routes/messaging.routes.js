import telegramController from '../controllers/messaging/telegram.controller.js';
import integrationController from '../controllers/integration.controller.js';

export default async function messagingRoutes(fastify, options) {
    /**
     * Telegram webhook
     * POST /webhooks/telegram
     */
    fastify.post('/webhooks/telegram', {
        schema: {
            description: 'Telegram bot webhook',
            tags: ['webhooks'],
            hide: true  // Don't show in Swagger
        }
    }, telegramController.handleWebhook.bind(telegramController));

    /**
     * Get user integrations
     * GET /integrations
     */
    fastify.get('/integrations', {
        schema: {
            description: 'Get user messaging platform integrations',
            tags: ['integrations']
        }
    }, integrationController.getUserIntegrations.bind(integrationController));

    /**
     * Activate integration
     * POST /integrations/activate
     */
    fastify.post('/integrations/activate', {
        schema: {
            description: 'Activate messaging platform integration with code',
            tags: ['integrations'],
            body: {
                type: 'object',
                required: ['activation_code'],
                properties: {
                    activation_code: { type: 'string' }
                }
            }
        }
    }, integrationController.activateIntegration.bind(integrationController));

    /**
     * Update integration preferences
     * PATCH /integrations/:id
     */
    fastify.patch('/integrations/:id', {
        schema: {
            description: 'Update integration preferences',
            tags: ['integrations'],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' }
                }
            },
            body: {
                type: 'object',
                properties: {
                    ghost_mode_enabled: { type: 'boolean' },
                    reply_mode: { type: 'string' },
                    digest_time: { type: 'string' },
                    timezone: { type: 'string' }
                }
            }
        }
    }, integrationController.updatePreferences.bind(integrationController));

    /**
     * Deactivate integration
     * DELETE /integrations/:id
     */
    fastify.delete('/integrations/:id', {
        schema: {
            description: 'Deactivate messaging platform integration',
            tags: ['integrations'],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' }
                }
            }
        }
    }, integrationController.deactivateIntegration.bind(integrationController));
}
