import entityService from '../../services/entities/entityService.js';
import entityExtractionService from '../../services/entities/entityExtractionService.js';

/**
 * Entity Controller
 * Handles HTTP requests for entity management
 */
class EntityController {
    /**
     * Get all entities for user with filters
     */
    async getEntities(request, reply) {
        try {
            const userId = request.userId;
            const { entity_type, category, search, sortBy, sortOrder, limit, offset } = request.query;

            const entities = await entityService.getUserEntities(userId, {
                entity_type,
                category,
                search,
                sortBy,
                sortOrder,
                limit: limit ? parseInt(limit) : undefined,
                offset: offset ? parseInt(offset) : undefined
            });

            return {
                success: true,
                data: entities,
                count: entities.length
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
     * Get single entity by ID
     */
    async getEntity(request, reply) {
        try {
            const userId = request.userId;
            const { id } = request.params;

            const entity = await entityService.getEntityById(userId, id);

            return {
                success: true,
                data: entity
            };
        } catch (error) {
            reply.code(error.message === 'Entity not found' ? 404 : 500);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Search entities
     */
    async searchEntities(request, reply) {
        try {
            const userId = request.userId;
            const { q, entity_type } = request.query;

            if (!q) {
                reply.code(400);
                return {
                    success: false,
                    error: 'Search query (q) is required'
                };
            }

            const entities = await entityService.searchEntities(userId, q, entity_type);

            return {
                success: true,
                data: entities,
                count: entities.length
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
     * Get entity statistics
     */
    async getStats(request, reply) {
        try {
            const userId = request.userId;

            const stats = await entityService.getEntityStats(userId);

            return {
                success: true,
                data: stats
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
     * Get top entities
     */
    async getTopEntities(request, reply) {
        try {
            const userId = request.userId;
            const { limit, entity_type } = request.query;

            const entities = await entityService.getTopEntities(
                userId,
                limit ? parseInt(limit) : 10,
                entity_type
            );

            return {
                success: true,
                data: entities,
                count: entities.length
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
     * Update entity
     */
    async updateEntity(request, reply) {
        try {
            const userId = request.userId;
            const { id } = request.params;

            const entity = await entityService.updateEntity(userId, id, request.body);

            return {
                success: true,
                data: entity
            };
        } catch (error) {
            reply.code(error.message === 'Entity not found' ? 404 : 400);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Delete entity
     */
    async deleteEntity(request, reply) {
        try {
            const userId = request.userId;
            const { id } = request.params;

            const entity = await entityService.deleteEntity(userId, id);

            return {
                success: true,
                message: 'Entity deleted',
                data: entity
            };
        } catch (error) {
            reply.code(error.message === 'Entity not found' ? 404 : 500);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Extract entities from memories (batch operation)
     */
    async extractFromMemories(request, reply) {
        try {
            const userId = request.userId;
            const { limit } = request.body;

            const result = await entityExtractionService.extractFromMemories(
                userId,
                limit || 100
            );

            return {
                success: true,
                data: result
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
     * Get recent entities
     */
    async getRecentEntities(request, reply) {
        try {
            const userId = request.userId;
            const { days, limit } = request.query;

            const entities = await entityService.getRecentEntities(
                userId,
                days ? parseInt(days) : 7,
                limit ? parseInt(limit) : 20
            );

            return {
                success: true,
                data: entities,
                count: entities.length
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

export default new EntityController();
