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

    // Voice query with consistency
    fastify.post('/voice', {
        schema: {
            description: 'Ask questions via voice with consistency tracking',
            tags: ['query'],
            body: {
                type: 'object',
                required: ['audio'],
                properties: {
                    audio: {
                        type: 'string',
                        description: 'Base64 encoded audio'
                    },
                    mimeType: {
                        type: 'string',
                        default: 'audio/webm'
                    }
                }
            }
        }
    }, queryController.voiceQuery.bind(queryController));

    // Text query with consistency (for testing)
    fastify.post('/text', {
        schema: {
            description: 'Ask questions via text with consistency tracking',
            tags: ['query'],
            body: {
                type: 'object',
                required: ['question'],
                properties: {
                    question: {
                        type: 'string',
                        examples: [
                            'Did I take vitamin C today?',
                            'When did I last water the plants?',
                            'How often do I exercise?'
                        ]
                    }
                }
            }
        }
    }, queryController.textQuery.bind(queryController));
}

export default queryRoutes;
