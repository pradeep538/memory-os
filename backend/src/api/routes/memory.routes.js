import memoryController from '../controllers/memory.controller.js';
import auth from '../../middleware/auth.js';

/**
 * Memory routes plugin
 * Prefix: /api/v1/memory
 */
async function memoryRoutes(fastify, options) {
    // Create memory
    fastify.post('/', {
        preHandler: auth.authenticate,
        schema: {
            description: 'Create a new memory unit',
            tags: ['memory'],
            body: {
                type: 'object',
                required: ['rawInput', 'eventType', 'category', 'normalizedData'],
                properties: {
                    rawInput: { type: 'string', description: 'Original user input' },
                    source: { type: 'string', enum: ['text', 'voice', 'api'], default: 'text' },
                    eventType: { type: 'string' },
                    category: { type: 'string' },
                    normalizedData: { type: 'object' },
                    confidenceScore: { type: 'number', minimum: 0, maximum: 1 }
                }
            },
            response: {
                201: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: { type: 'object' },
                        message: { type: 'string' }
                    }
                }
            }
        }
    }, memoryController.create.bind(memoryController));

    // List memories
    fastify.get('/', {
        preHandler: auth.authenticate,
        schema: {
            description: 'Get user memories with optional filters',
            tags: ['memory'],
            querystring: {
                type: 'object',
                properties: {
                    category: { type: 'string' },
                    eventType: { type: 'string' },
                    startDate: { type: 'string', format: 'date-time' },
                    endDate: { type: 'string', format: 'date-time' },
                    limit: { type: 'integer', default: 50 },
                    offset: { type: 'integer', default: 0 }
                }
            },
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
    }, memoryController.list.bind(memoryController));

    // Category statistics
    fastify.get('/stats/categories', {
        preHandler: auth.authenticate,
        schema: {
            description: 'Get memory count by category',
            tags: ['memory', 'stats'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: {
                            type: 'object',
                            additionalProperties: { type: 'number' }
                        }
                    }
                }
            }
        }
    }, memoryController.categoryStats.bind(memoryController));

    // Get single memory
    fastify.get('/:id', {
        preHandler: auth.authenticate,
        schema: {
            description: 'Get a specific memory by ID',
            tags: ['memory'],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' }
                }
            }
        }
    }, memoryController.get.bind(memoryController));

    // Correct memory
    fastify.post('/:id/correct', {
        preHandler: auth.authenticate,
        schema: {
            description: 'Create a correction for an existing memory',
            tags: ['memory'],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' }
                }
            },
            body: {
                type: 'object',
                required: ['rawInput', 'eventType', 'category', 'normalizedData'],
                properties: {
                    rawInput: { type: 'string' },
                    eventType: { type: 'string' },
                    category: { type: 'string' },
                    normalizedData: { type: 'object' }
                }
            }
        }
    }, memoryController.correct.bind(memoryController));

    // Delete memory
    fastify.delete('/:id', {
        preHandler: auth.authenticate,
        schema: {
            description: 'Delete a specific memory by ID',
            tags: ['memory'],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' }
                    }
                }
            }
        }
    }, memoryController.remove.bind(memoryController));
}

export default memoryRoutes;
