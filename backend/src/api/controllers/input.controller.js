import inputService from '../../services/understanding/inputService.js';
import memoryService from '../../services/memory/memoryService.js';
import llmService from '../../services/understanding/llmService.js';
import inputEnhancementService from '../../services/input/inputEnhancementService.js';
import MemoryModel from '../../models/memory.model.js';

class InputController {
    /**
     * Process text input with LLM enhancement
     * POST /api/v1/input/text
     */
    async processText(request, reply) {
        try {
            const { text, skip_enhancement } = request.body;

            // Validate
            if (!text || text.trim().length < 2) {
                return reply.code(400).send({
                    success: false,
                    error: 'Text too short (minimum 2 characters)'
                });
            }

            // TODO: Get userId from auth
            const userId = '00000000-0000-0000-0000-000000000000';

            // Step 1: Enhance with LLM
            const enhancement = await inputEnhancementService.enhance(text, 'text');

            if (!enhancement.success) {
                return reply.code(400).send({
                    success: false,
                    error: enhancement.error,
                    needs_rephrase: true
                });
            }

            // Step 2: Check confidence threshold
            const CONFIDENCE_THRESHOLD = 0.8;
            const needsConfirmation = enhancement.confidence < CONFIDENCE_THRESHOLD;

            // Step 3a: Low confidence - return for user confirmation
            if (needsConfirmation) {
                return reply.code(200).send({
                    success: true,
                    needs_confirmation: true,
                    raw_text: enhancement.raw_text,
                    enhanced_text: enhancement.enhanced_text,
                    detected_category: enhancement.detected_category,
                    detected_entities: enhancement.detected_entities,
                    confidence: enhancement.confidence,
                    confidence_level: this.getConfidenceLevel(enhancement.confidence),
                    reasoning: enhancement.reasoning,
                    suggestions: enhancement.confidence < 0.4 ?
                        await inputEnhancementService.generateSuggestions(text) : null
                });
            }

            // Step 3b: High confidence - auto-process
            const memory = await this.createMemoryFromEnhancement(
                userId,
                enhancement,
                'text'
            );

            // Generate success message
            const confirmation = `✓ Logged! ${enhancement.enhanced_text}`;

            reply.code(201).send({
                success: true,
                auto_processed: true,
                memory,
                enhancement: {
                    raw_text: enhancement.raw_text,
                    enhanced_text: enhancement.enhanced_text,
                    confidence: enhancement.confidence
                },
                confirmation
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
     * Confirm and create memory from low-confidence enhancement
     * POST /api/v The request body should include:
     * - enhanced_text: string (user can edit)
     * - category: string
     * - entities: object
     */
    async confirmEnhancement(request, reply) {
        try {
            const { enhanced_text, category, entities } = request.body;

            if (!enhanced_text) {
                return reply.code(400).send({
                    success: false,
                    error: 'Enhanced text is required'
                });
            }

            const userId = '00000000-0000-0000-0000-000000000000';

            // Create memory with user-confirmed data
            const memory = await MemoryModel.create({
                userId,
                rawInput: enhanced_text,
                source: 'text',
                eventType: 'user_log',
                category: category || 'generic',
                normalizedData: entities || {},
                confidenceScore: 1.0, // User confirmed = 100%
                status: 'validated'
            });

            reply.code(201).send({
                success: true,
                memory,
                confirmation: `✓ Logged! ${enhanced_text}`
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
     * Process voice input
     * POST /api/v1/input/voice
     */
    async processVoice(request, reply) {
        try {
            // TODO: Get userId from auth
            const userId = '00000000-0000-0000-0000-000000000000';

            // Get audio file from multipart
            const data = await request.file();

            if (!data) {
                return reply.code(400).send({
                    success: false,
                    error: 'No audio file uploaded'
                });
            }

            // Read file buffer
            const audioBuffer = await data.toBuffer();

            // Validate
            inputService.validateVoiceInput(audioBuffer);

            // Get audio metadata from fields or headers
            const audioMetadata = {
                encoding: data.fields?.encoding?.value || 'WEBM_OPUS',
                sampleRate: parseInt(data.fields?.sampleRate?.value || '48000'),
                language: data.fields?.language?.value || 'en-US'
            };

            // 1. Process voice (transcribe + understand)
            const processed = await inputService.processVoice(userId, audioBuffer, audioMetadata);

            // 2. Store memory
            const memory = await memoryService.createMemory(userId, processed);

            // 3. Generate friendly confirmation
            const confirmation = await llmService.generateResponse('voice_memory_created', {
                transcription: processed.rawInput,
                activity: processed.normalizedData.activity,
                category: processed.category
            });

            reply.code(201).send({
                success: true,
                data: {
                    memory,
                    transcription: {
                        text: processed.rawInput,
                        confidence: processed.transcriptionMeta.confidence,
                        language: processed.transcriptionMeta.language
                    },
                    understanding: {
                        eventType: processed.eventType,
                        category: processed.category,
                        confidence: processed.confidenceScore
                    },
                    confirmation
                }
            });
        } catch (error) {
            request.log.error(error);

            const statusCode = error.message.includes('limit') ? 429
                : error.message.includes('Invalid') ? 400
                    : 500;

            reply.code(statusCode).send({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get voice quota status
     * GET /api/v1/input/audio/quota
     */
    async getVoiceQuota(request, reply) {
        try {
            const userId = '00000000-0000-0000-0000-000000000000'; // TODO: Get from auth

            const voiceQuotaService = (await import('../../services/quota/voiceQuotaService.js')).default;
            const userTier = await voiceQuotaService.getUserTier(userId);
            const quotaStatus = await voiceQuotaService.getQuotaStatus(userId, userTier);

            reply.send({
                success: true,
                quota: quotaStatus
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
     * Process audio input with Gemini native audio support
     * POST /api/v1/input/audio
     */
    async processAudio(request, reply) {
        try {
            const userId = '00000000-0000-0000-0000-000000000000';

            // Import quota service
            const voiceQuotaService = (await import('../../services/quota/voiceQuotaService.js')).default;

            // Get user tier
            const userTier = await voiceQuotaService.getUserTier(userId);

            // Check voice quota
            const quotaCheck = await voiceQuotaService.checkQuota(userId, userTier);

            if (!quotaCheck.allowed) {
                return reply.code(429).send({
                    success: false,
                    error: 'Voice quota exceeded',
                    quota: {
                        used: quotaCheck.used,
                        limit: quotaCheck.limit,
                        remaining: quotaCheck.remaining,
                        resetsAt: quotaCheck.resetsAt
                    },
                    message: `You've used all ${quotaCheck.limit} voice submissions for today. Resets at ${quotaCheck.resetsAt.toLocaleTimeString()}. Upgrade to Pro for 30 daily submissions!`
                });
            }

            const data = await request.file();
            if (!data) {
                return reply.code(400).send({ success: false, error: 'No audio file uploaded' });
            }

            const audioBuffer = await data.toBuffer();

            // Validate audio size (max 500KB for 6-second audio)
            const MAX_AUDIO_SIZE = 500 * 1024; // 500 KB
            if (audioBuffer.length > MAX_AUDIO_SIZE) {
                return reply.code(400).send({
                    success: false,
                    error: `Audio file too large (max 500KB). Your file: ${Math.round(audioBuffer.length / 1024)}KB`
                });
            }

            const duration = parseInt(data.fields?.duration?.value || '6');
            const mimeType = data.mimetype || 'audio/webm';

            request.log.info(`Processing audio: ${mimeType}, ${duration}s, ${Math.round(audioBuffer.length / 1024)}KB`);

            const audioEnhancementService = (await import('../../services/input/audioEnhancementService.js')).default;
            const enhancement = await audioEnhancementService.enhanceFromAudio(audioBuffer, mimeType, duration);

            if (!enhancement.success) {
                return reply.code(400).send({ success: false, error: enhancement.error || 'Audio processing failed', needs_rephrase: true });
            }

            const needsConfirmation = enhancement.confidence < 0.8;

            if (needsConfirmation) {
                return reply.code(200).send({
                    success: true,
                    needs_confirmation: true,
                    transcription: enhancement.transcription,
                    raw_text: enhancement.transcription,
                    enhanced_text: enhancement.enhanced_text,
                    detected_category: enhancement.detected_category,
                    detected_entities: enhancement.detected_entities,
                    confidence: enhancement.confidence,
                    confidence_level: this.getConfidenceLevel(enhancement.confidence),
                    audio_quality: enhancement.audio_quality
                });
            }

            const memory = await this.createMemoryFromEnhancement(userId, { ...enhancement, raw_text: enhancement.transcription }, 'voice');

            // Get updated quota status (reuse existing service instance)
            const quotaStatus = await voiceQuotaService.getQuotaStatus(userId, userTier);

            reply.code(201).send({
                success: true,
                auto_processed: true,
                memory,
                transcription: enhancement.transcription,
                enhancement: { enhanced_text: enhancement.enhanced_text, confidence: enhancement.confidence },
                confirmation: `✓ Logged! ${enhancement.enhanced_text}`,
                quota: {
                    used: quotaStatus.used,
                    remaining: quotaStatus.remaining,
                    limit: quotaStatus.limit,
                    resetsAt: quotaStatus.resetsAt,
                    warning: quotaStatus.remaining <= 1 ? `Only ${quotaStatus.remaining} voice submission${quotaStatus.remaining === 1 ? '' : 's'} left today!` : null
                }
            });

        } catch (error) {
            request.log.error(error);
            reply.code(500).send({ success: false, error: error.message });
        }
    }


    getNextMidnight() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow.toISOString();
    }

    /**
     * Get confidence level label
     */
    getConfidenceLevel(confidence) {
        if (confidence >= 0.8) return 'high';
        if (confidence >= 0.5) return 'medium';
        return 'low';
    }

    /**
     * Create memory from enhancement result
     */
    async createMemoryFromEnhancement(userId, enhancement, source) {
        const { enhanced_text, detected_category, detected_entities } = enhancement;

        const memory = await MemoryModel.create({
            userId,
            rawInput: enhanced_text,
            source,
            eventType: 'user_log',
            category: detected_category || 'generic',
            normalizedData: {
                original_text: enhanced_text,
                ...detected_entities,
                enhancement_confidence: enhancement.confidence
            },
            confidenceScore: enhancement.confidence,
            status: enhancement.confidence >= 0.8 ? 'validated' : 'tentative'
        });

        return memory;
    }
}

export default new InputController();
