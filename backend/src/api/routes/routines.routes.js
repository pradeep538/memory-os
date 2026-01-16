import routinesController from '../controllers/routines.controller.js';

/**
 * Routines routes plugin
 * Prefix: /api/v1/routines
 */
async function routinesRoutes(fastify, options) {
    // Create routine
    fastify.post('/', {
        schema: {
            description: 'Create a new routine schedule',
            tags: ['routines'],
            body: {
                type: 'object',
                required: ['routineName', 'routineType', 'scheduleTimes', 'scheduleDays'],
                properties: {
                    routineName: { type: 'string' },
                    routineType: {
                        type: 'string',
                        enum: ['medication', 'plant_care', 'maintenance', 'custom']
                    },
                    description: { type: 'string' },
                    scheduleTimes: {
                        type: 'array',
                        items: { type: 'string', pattern: '^\\d{2}:\\d{2}$' }
                    },
                    scheduleDays: {
                        type: 'array',
                        items: { type: 'integer', minimum: 1, maximum: 7 }
                    },
                    frequency: {
                        type: 'string',
                        enum: ['daily', 'weekly', 'custom'],
                        default: 'custom'
                    },
                    notificationTitle: { type: 'string' },
                    notificationBody: { type: 'string' }
                }
            }
        }
    }, routinesController.create.bind(routinesController));

    // List all routines
    fastify.get('/', {
        schema: {
            description: 'Get all user routines',
            tags: ['routines']
        }
    }, routinesController.list.bind(routinesController));

    // Get specific routine
    fastify.get('/:id', {
        schema: {
            description: 'Get routine by ID',
            tags: ['routines'],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' }
                }
            }
        }
    }, routinesController.getOne.bind(routinesController));

    // Update routine
    fastify.put('/:id', {
        schema: {
            description: 'Update routine',
            tags: ['routines'],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' }
                }
            }
        }
    }, routinesController.update.bind(routinesController));

    // Delete routine
    fastify.delete('/:id', {
        schema: {
            description: 'Delete routine',
            tags: ['routines'],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' }
                }
            }
        }
    }, routinesController.delete.bind(routinesController));

    // Toggle notification
    fastify.patch('/:id/toggle', {
        schema: {
            description: 'Toggle routine notification on/off',
            tags: ['routines'],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' }
                }
            }
        }
    }, routinesController.toggleNotification.bind(routinesController));
}

export default routinesRoutes;
