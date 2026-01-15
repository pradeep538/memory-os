import queryController from '../controllers/query.controller.js';

/**
 * Query routes plugin
 * Prefix: /api/v1/query
 */
async function queryRoutes(fastify, options) {
    // Natural language query
    fastify.post('/', {
        schema: {
            description: 'Ask anything about your life data using natural language',
            tags: ['query'],
            body: {
                type: 'object',
                required: ['question'],
                properties: {
                    question: {
                        type: 'string',
                        description: 'Natural language question',
                        examples: [
                            'How much did I spend on food this month?',
                            'How many workouts this week?',
                            'When did I last meditate?',
                            'Show my recent expenses'
                        ]
                    }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        question: { type: 'string' },
                        intent: { type: 'string' },
                        answer: { type: 'string' },
                        data: { type: ['object', 'array'] }
                    }
                }
            }
        }
    }, queryController.query.bind(queryController));
}

export default queryRoutes;
