import modulesController from '../controllers/modules.controller.js';

/**
 * Modules routes plugin
 * Prefix: /api/v1/modules
 */
async function modulesRoutes(fastify, options) {
    // List all registered modules
    fastify.get('/', {
        schema: {
            description: 'Get all registered category modules',
            tags: ['modules'],
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
    }, modulesController.listModules.bind(modulesController));

    // Get specific module info
    fastify.get('/:category', {
        schema: {
            description: 'Get info for a specific module',
            tags: ['modules'],
            params: {
                type: 'object',
                properties: {
                    category: { type: 'string' }
                }
            }
        }
    }, modulesController.getModule.bind(modulesController));
}

export default modulesRoutes;
