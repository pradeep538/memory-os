import integrationService from '../../../services/messaging/integrationService.js';

/**
 * Integration Controller
 * For managing user integrations from the app
 */
class IntegrationController {
    /**
     * Get user's integrations
     * GET /api/v1/integrations
     */
    async getUserIntegrations(request, reply) {
        try {
            const userId = request.userId || '00000000-0000-0000-0000-000000000000';

            const integrations = await integrationService.getUserIntegrations(userId);

            // Hide sensitive data
            const safe = integrations.map(i => ({
                id: i.id,
                platform: i.platform,
                is_active: i.is_active,
                ghost_mode_enabled: i.ghost_mode_enabled,
                reply_mode: i.reply_mode,
                digest_time: i.digest_time,
                timezone: i.timezone,
                activated_at: i.activated_at,
                last_message_at: i.last_message_at,
                created_at: i.created_at
            }));

            return {
                success: true,
                data: safe,
                count: safe.length
            };
        } catch (error) {
            reply.code(500);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Activate integration with code
     * POST /api/v1/integrations/activate
     */
    async activateIntegration(request, reply) {
        try {
            const userId = request.userId || '00000000-0000-0000-0000-000000000000';
            const { activation_code } = request.body;

            if (!activation_code) {
                reply.code(400);
                return {
                    success: false,
                    error: 'activation_code is required'
                };
            }

            // Find integration by token
            const integration = await integrationService.getIntegrationByToken(activation_code);

            if (!integration) {
                reply.code(404);
                return {
                    success: false,
                    error: 'Invalid activation code'
                };
            }

            // Activate it
            const activated = await integrationService.activateIntegration(
                integration.platform,
                integration.platform_user_id,
                activation_code,
                userId
            );

            if (!activated) {
                reply.code(500);
                return {
                    success: false,
                    error: 'Failed to activate integration'
                };
            }

            return {
                success: true,
                data: {
                    id: activated.id,
                    platform: activated.platform,
                    is_active: activated.is_active,
                    activated_at: activated.activated_at
                },
                message: `${activated.platform} integration activated!`
            };
        } catch (error) {
            reply.code(500);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Update integration preferences
     * PATCH /api/v1/integrations/:id
     */
    async updatePreferences(request, reply) {
        try {
            const { id } = request.params;
            const preferences = request.body;

            const updated = await integrationService.updatePreferences(id, preferences);

            if (!updated) {
                reply.code(404);
                return {
                    success: false,
                    error: 'Integration not found'
                };
            }

            return {
                success: true,
                data: {
                    id: updated.id,
                    ghost_mode_enabled: updated.ghost_mode_enabled,
                    reply_mode: updated.reply_mode,
                    digest_time: updated.digest_time,
                    timezone: updated.timezone
                },
                message: 'Preferences updated'
            };
        } catch (error) {
            reply.code(500);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Deactivate integration
     * DELETE /api/v1/integrations/:id
     */
    async deactivateIntegration(request, reply) {
        try {
            const userId = request.userId || '00000000-0000-0000-0000-000000000000';
            const { id } = request.params;

            await integrationService.deactivateIntegration(id, userId);

            return {
                success: true,
                message: 'Integration deactivated'
            };
        } catch (error) {
            reply.code(500);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

export default new IntegrationController();
