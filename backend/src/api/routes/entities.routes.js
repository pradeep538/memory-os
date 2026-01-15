import entityController from '../controllers/entity.controller.js';

export default async function entityRoutes(fastify, options) {
    /**
     * Get all entities
     */
    fastify.get('/entities', {
        schema: {
            description: 'Get all entities for user with optional filters',
            tags: ['entities'],
            querystring: {
                type: 'object',
                properties: {
                    entity_type: { type: 'string', enum: ['person', 'place', 'item', 'organization', 'concept'] },
                    category: { type: 'string' },
                    search: { type: 'string' },
                    sortBy: { type: 'string', enum: ['mention_count', 'last_seen_at', 'first_seen_at', 'name'], default: 'mention_count' },
                    sortOrder: { type: 'string', enum: ['ASC', 'DESC'], default: 'DESC' },
                    limit: { type: 'integer', default: 50 },
                    offset: { type: 'integer', default: 0 }
                }
            }
        }
    }, entityController.getEntities.bind(entityController));

    /**
     * Get entity by ID
     */
    fastify.get('/entities/:id', {
        schema: {
            description: 'Get a single entity by ID',
            tags: ['entities'],
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string', format: 'uuid' }
                }
            }
        }
    }, entityController.getEntity.bind(entityController));

    /**
     * Search entities
     */
    fastify.get('/entities/search', {
        schema: {
            description: 'Search entities by name',
            tags: ['entities'],
            querystring: {
                type: 'object',
                required: ['q'],
                properties: {
                    q: { type: 'string', description: 'Search query' },
                    entity_type: { type: 'string', enum: ['person', 'place', 'item', 'organization', 'concept'] }
                }
            }
        }
    }, entityController.searchEntities.bind(entityController));

    /**
     * Get entity statistics
     */
    fastify.get('/entities/stats', {
        schema: {
            description: 'Get entity statistics (count by type)',
            tags: ['entities']
        }
    }, entityController.getStats.bind(entityController));

    /**
     * Get top entities
     */
    fastify.get('/entities/top', {
        schema: {
            description: 'Get most mentioned entities',
            tags: ['entities'],
            querystring: {
                type: 'object',
                properties: {
                    limit: { type: 'integer', default: 10 },
                    entity_type: { type: 'string' }
                }
            }
        }
    }, entityController.getTopEntities.bind(entityController));

    /**
     * Get recent entities
     */
    fastify.get('/entities/recent', {
        schema: {
            description: 'Get recently seen entities',
            tags: ['entities'],
            querystring: {
                type: 'object',
                properties: {
                    days: { type: 'integer', default: 7 },
                    limit: { type: 'integer', default: 20 }
                }
            }
        }
    }, entityController.getRecentEntities.bind(entityController));

    /**
     * Update entity
     */
    fastify.patch('/entities/:id', {
        schema: {
            description: 'Update an entity',
            tags: ['entities'],
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string', format: 'uuid' }
                }
            },
            body: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    category: { type: 'string' },
                    properties: { type: 'object' }
                }
            }
        }
    }, entityController.updateEntity.bind(entityController));

    /**
     * Delete entity
     */
    fastify.delete('/entities/:id', {
        schema: {
            description: 'Delete an entity',
            tags: ['entities'],
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string', format: 'uuid' }
                }
            }
        }
    }, entityController.deleteEntity.bind(entityController));

    /**
     * Extract entities from memories (batch)
     */
    fastify.post('/entities/extract', {
        schema: {
            description: 'Extract entities from recent memories',
            tags: ['entities'],
            body: {
                type: 'object',
                properties: {
                    limit: { type: 'integer', default: 100 }
                }
            }
        }
    }, entityController.extractFromMemories.bind(entityController));
}
