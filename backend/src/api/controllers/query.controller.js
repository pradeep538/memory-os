import queryEngineService from '../../services/intelligence/queryEngineService.js';

class QueryController {
    /**
     * Process natural language query
     * POST /api/v1/query
     */
    async query(request, reply) {
        try {
            const { question } = request.body;

            if (!question) {
                return reply.code(400).send({
                    success: false,
                    error: 'Question is required'
                });
            }

            // TODO: Get userId from auth
            const userId = '00000000-0000-0000-0000-000000000000';

            const result = await queryEngineService.query(userId, question);

            reply.send(result);
        } catch (error) {
            request.log.error(error);
            reply.code(500).send({
                success: false,
                error: error.message
            });
        }
    }
}

export default new QueryController();
