import inputController from '../controllers/input.controller.js';

/**
 * Input routes plugin
 * Prefix: /api/v1/input
 */
async function inputRoutes(fastify, options) {
    // Process text input
    // Process text input
    fastify.post('/text', {
        config: {
            rateLimit: {
                max: 30, // Strict limit for LLM endpoints
                timeWindow: '1 hour'
            }
        },
        schema: {
            description: 'Process natural language text input',
            tags: ['input'],
            body: {
                type: 'object',
                required: ['text'],
                properties: {
                    text: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 1000,
                        description: 'User input text'
                    }
                }
            },
            response: {
                201: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: {
                            type: 'object',
                            properties: {
                                memory: { type: 'object' },
                                understanding: { type: 'object' },
                                confirmation: { type: 'string' }
                            }
                        }
                    }
                }
            }
        }
    }, inputController.processText.bind(inputController));

    // Enhance Goal (Blueprint)
    fastify.post('/enhance-goal', {
        schema: {
            description: 'Refine a blueprint goal using AI',
            tags: ['input'],
            body: {
                type: 'object',
                required: ['goal'],
                properties: {
                    goal: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: {
                            type: 'object',
                            properties: {
                                refined_goal: { type: 'string' },
                                short_name: { type: 'string' }
                            }
                        }
                    }
                }
            }
        }
    }, inputController.enhanceGoal.bind(inputController));

    // Confirm low-confidence enhancement
    fastify.post('/confirm', {
        schema: {
            description: 'Confirm and process low-confidence enhancement',
            tags: ['input'],
            body: {
                type: 'object',
                required: ['enhanced_text'],
                properties: {
                    enhanced_text: { type: 'string' },
                    category: { type: 'string' },
                    entities: { type: 'object' }
                }
            },
            response: {
                201: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: {
                            type: 'object',
                            properties: {
                                memory: { type: 'object' },
                                confirmation: { type: 'string' }
                            }
                        }
                    }
                }
            }
        }
    }, inputController.confirmEnhancement.bind(inputController));

    // Process audio input with Gemini native audio support (NEW)
    // Process audio input with Gemini native audio support (NEW)
    fastify.post('/audio', {
        config: {
            rateLimit: {
                max: 10,
                timeWindow: '1 hour'
            }
        },
        schema: {
            description: 'Process audio input using Gemini native audio processing',
            tags: ['input', 'audio'],
            consumes: ['multipart/form-data'],
            response: {
                201: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        auto_processed: { type: 'boolean' },
                        memory: { type: 'object' },
                        transcription: { type: 'string' },
                        enhancement: { type: 'object' },
                        audio_quality: { type: 'string' },
                        confirmation: { type: 'string' }
                    }
                },
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        needs_confirmation: { type: 'boolean' },
                        transcription: { type: 'string' },
                        enhanced_text: { type: 'string' },
                        confidence: { type: 'number' },
                        detected_category: { type: 'string' },
                        detected_entities: { type: 'object' }
                    }
                }
            }
        }
    }, inputController.processAudio.bind(inputController));

    // Transcribe audio only (Architect Mode)
    fastify.post('/transcribe', {
        schema: {
            description: 'Transcribe audio without creating memory',
            tags: ['input', 'audio'],
            consumes: ['multipart/form-data'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: {
                            type: 'object',
                            properties: {
                                text: { type: 'string' }
                            }
                        }
                    }
                }
            }
        }
    }, inputController.transcribeAudio.bind(inputController));


    // Get voice quota status
    fastify.get('/audio/quota', {
        schema: {
            description: 'Get voice submission quota status for current user',
            tags: ['input', 'audio', 'quota'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: {
                            type: 'object',
                            properties: {
                                tier: { type: 'string' },
                                used: { type: 'number' },
                                remaining: { type: ['number', 'string'] },
                                limit: { type: ['number', 'null'] },
                                resetsAt: { type: ['string', 'null'] },
                                percentage: { type: 'number' }
                            }
                        }
                    }
                }
            }
        }
    }, inputController.getVoiceQuota.bind(inputController));

    // Process voice input
    fastify.post('/voice', {
        schema: {
            description: 'Process voice input (audio file)',
            tags: ['input', 'voice'],
            consumes: ['multipart/form-data'],
            response: {
                201: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: {
                            type: 'object',
                            properties: {
                                memory: { type: 'object' },
                                transcription: { type: 'object' },
                                understanding: { type: 'object' },
                                confirmation: { type: 'string' }
                            }
                        }
                    }
                }
            }
        }
    }, inputController.processVoice.bind(inputController));

    // Get voice quota
    fastify.get('/voice/quota', {
        schema: {
            description: 'Get remaining voice input quota for free tier',
            tags: ['input', 'voice'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: {
                            type: 'object',
                            properties: {
                                tier: { type: 'string' },
                                used: { type: ['integer', 'null'] },
                                remaining: { type: ['integer', 'string'] },
                                limit: { type: ['integer', 'null'] },
                                resetsAt: { type: 'string' }
                            }
                        }
                    }
                }
            }
        }
    }, inputController.getVoiceQuota.bind(inputController));
}

export default inputRoutes;
