import memoryService from '../../services/memory/memoryService.js';

class MemoryController {
    /**
     * Create a new memory
     * POST /api/v1/memory
     */
    async create(request, reply) {
        try {
            const { rawInput, source, eventType, category, normalizedData, confidenceScore } = request.body;


            const userId = request.userId;

            const memory = await memoryService.createMemory(userId, {
                rawInput,
                source,
                eventType,
                category,
                normalizedData,
                confidenceScore: confidenceScore || 0.8
            });

            reply.code(201).send({
                success: true,
                data: memory,
                message: 'Memory created successfully'
            });
        } catch (error) {
            request.log.error(error);
            reply.code(500).send({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get user memories
     * GET /api/v1/memory
     */
    async list(request, reply) {
        try {
            const { category, eventType, startDate, endDate, limit, offset } = request.query;


            const userId = request.userId;

            const memories = await memoryService.getUserMemories(userId, {
                category,
                eventType,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                limit: limit ? parseInt(limit) : 50,
                offset: offset ? parseInt(offset) : 0
            });

            reply.send({
                success: true,
                data: memories,
                count: memories.length
            });
        } catch (error) {
            request.log.error(error);
            reply.code(500).send({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get single memory
     * GET /api/v1/memory/:id
     */
    async get(request, reply) {
        try {
            const { id } = request.params;


            const userId = request.userId;

            const memory = await memoryService.getMemory(id, userId);

            if (!memory) {
                return reply.code(404).send({
                    success: false,
                    error: 'Memory not found'
                });
            }

            reply.send({
                success: true,
                data: memory
            });
        } catch (error) {
            request.log.error(error);
            reply.code(500).send({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Correct a memory
     * POST /api/v1/memory/:id/correct
     */
    async correct(request, reply) {
        try {
            const { id } = request.params;
            const correctedData = request.body;


            const userId = request.userId;

            const correctedMemory = await memoryService.correctMemory(id, userId, correctedData);

            reply.code(201).send({
                success: true,
                data: correctedMemory,
                message: 'Memory corrected successfully'
            });
        } catch (error) {
            request.log.error(error);
            reply.code(500).send({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get category statistics
     * GET /api/v1/memory/stats/categories
     */
    async categoryStats(request, reply) {
        try {

            const userId = request.userId;

            const stats = await memoryService.getCategoryStats(userId);

            reply.send({
                success: true,
                data: stats
            });
        } catch (error) {
            request.log.error(error);
            reply.code(500).send({
                success: false,
                error: error.message
            });
        }
    }
    /**
     * Remove a memory
     * DELETE /api/v1/memory/:id
     */
    async remove(request, reply) {
        try {
            const { id } = request.params;
            const userId = request.userId;

            const deletedMemory = await memoryService.deleteMemory(id, userId);

            if (!deletedMemory) {
                return reply.code(404).send({
                    success: false,
                    error: 'Memory not found'
                });
            }

            reply.send({
                success: true,
                message: 'Memory deleted successfully'
            });
        } catch (error) {
            request.log.error(error);
            reply.code(500).send({
                success: false,
                error: error.message
            });
        }
    }
}

export default new MemoryController();
