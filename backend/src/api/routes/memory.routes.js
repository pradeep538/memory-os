import memoryController from '../controllers/memory.controller.js';

/**
 * Memory routes plugin
 * Prefix: /api/v1/memory
 */
async function memoryRoutes(fastify, options) {
    // Create memory
    fastify.post('/', {
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
        schema: {
            description: 'Get memory count by category',
            tags: ['memory', 'stats'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: { type: 'array' }
                    }
                }
            }
        }
    }, memoryController.categoryStats.bind(memoryController));

    // Get single memory
    fastify.get('/:id', {
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
}

export default memoryRoutes;
