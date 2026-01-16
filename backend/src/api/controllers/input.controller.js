import inputService from '../../services/understanding/inputService.js';
import memoryService from '../../services/memory/memoryService.js';
import llmService from '../../services/understanding/llmService.js';
import inputEnhancementService from '../../services/input/inputEnhancementService.js';
import habitService from '../../services/habits/habitService.js';
import MemoryModel from '../../models/memory.model.js';
import PlanModel from '../../models/plan.model.js';
import queue from '../../lib/queue.js';
import { validationService } from '../../services/validation/validationService.js';
import { hybridExtractor } from '../../services/extraction/hybridExtractor.js';

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

            const userId = request.userId;
            const requestId = request.id;

            // Step 1: Save Raw Text Immediately (Resilient Flow)
            const memory = await MemoryModel.create({
                userId,
                rawInput: text,
                source: 'text',
                eventType: 'user_log',
                category: 'generic',
                normalizedData: {},
                confidenceScore: 0.0,
                status: 'processing'
            });

            // Step 1.5: Try hybrid extraction (NEW - Intent Architecture)
            let intentExtraction = null;
            try {
                intentExtraction = await hybridExtractor.extract(text);

                // If deterministic match, skip LLM and save directly
                if (intentExtraction.method === 'deterministic' && intentExtraction.confidence === 1.0) {
                    // Update memory with intent-based data
                    const updatedMemory = await MemoryModel.updateEnhancement(memory.id, userId, {
                        intent: intentExtraction.intent,
                        signals: intentExtraction.signals,
                        extraction_method: 'deterministic',
                        confidenceScore: 1.0,
                        status: 'validated'
                    });

                    // Apply validation for critical intents
                    if (['TRACK_MEDICATION', 'TRACK_EXPENSE'].includes(intentExtraction.intent)) {
                        // Validation already applied in Step 3.5 (below)
                        // Continue to that step
                    } else {
                        // Non-critical: return success immediately
                        return reply.code(201).send({
                            success: true,
                            data: {
                                auto_processed: true,
                                memory: updatedMemory,
                                intent: intentExtraction.intent,
                                signals: intentExtraction.signals,
                                method: 'deterministic',
                                confirmation: `✓ Logged: ${intentExtraction.intent}`
                            }
                        });
                    }
                }
            } catch (error) {
                console.warn('Hybrid extraction failed, falling back to LLM:', error.message);
                // Continue to LLM enhancement
            }

            // Step 2: Enhance with LLM - Pass userId for Plan Context
            const enhancement = await inputEnhancementService.enhance(text, 'text', userId);

            if (!enhancement.success) {
                // Determine if we should fail or just keep raw
                console.warn(`Enhancement failed for memory ${memory.id}: ${enhancement.error}`);
                await MemoryModel.updateStatus(memory.id, userId, 'failed_enhancement');

                // Return success but with warning (Data is safe!)
                return reply.code(201).send({
                    success: true,
                    data: {
                        auto_processed: false,
                        memory: { ...memory, status: 'failed_enhancement' },
                        confirmation: `✓ Logged raw text (AI enhancement failed)`,
                        warning: "AI enhancement currently unavailable. Saved as raw text."
                    }
                });
            }

            // Step 3: Check confidence threshold
            const CONFIDENCE_THRESHOLD = 0.8;
            const needsConfirmation = enhancement.confidence < CONFIDENCE_THRESHOLD;

            if (needsConfirmation) {
                // Update with what we have so far, but keep status 'processing' or 'tentative'?
                // Actually if it needs confirmation, we return 200 and ASK user.
                // But we already saved to DB.
                // So we should update DB with "Tentative" data.

                await MemoryModel.updateEnhancement(memory.id, userId, {
                    rawInput: enhancement.enhanced_text, // Use enhanced text as primary?
                    category: enhancement.detected_category,
                    normalizedData: {
                        original_text: enhancement.raw_text,
                        ...enhancement.detected_entities,
                        enhancement_confidence: enhancement.confidence
                    },
                    confidenceScore: enhancement.confidence,
                    status: 'tentative'
                });

                return reply.code(200).send({
                    success: true,
                    data: {
                        needs_confirmation: true,
                        memory_id: memory.id, // Client might need this to confirm
                        raw_text: enhancement.raw_text,
                        enhanced_text: enhancement.enhanced_text,
                        detected_category: enhancement.detected_category,
                        detected_entities: enhancement.detected_entities,
                        confidence: enhancement.confidence,
                        confidence_level: this.getConfidenceLevel(enhancement.confidence),
                        reasoning: enhancement.reasoning,
                        suggestions: enhancement.confidence < 0.4 ?
                            await inputEnhancementService.generateSuggestions(text) : null
                    }
                });
            }

            // Step 3.5: Validate critical data (NEW)
            if (['medication', 'finance'].includes(enhancement.detected_category)) {
                try {
                    let validation;

                    if (enhancement.detected_category === 'medication') {
                        validation = await validationService.validateMedicationLog(
                            userId,
                            enhancement.enhanced_text,
                            new Date()
                        );
                    } else if (enhancement.detected_category === 'finance') {
                        const amount = enhancement.detected_entities?.amount;
                        validation = await validationService.validateFinancialTransaction(
                            userId,
                            enhancement.enhanced_text,
                            amount,
                            new Date()
                        );
                    }

                    if (!validation.valid) {
                        // Validation failed - return error
                        await MemoryModel.updateStatus(memory.id, userId, 'validation_failed');

                        return reply.code(400).send({
                            success: false,
                            error: 'Validation failed',
                            errors: validation.errors,
                            duplicate: validation.duplicate,
                            memory_id: memory.id
                        });
                    }

                    // Add validation metadata
                    enhancement.detected_entities = {
                        ...enhancement.detected_entities,
                        validation_checksum: validation.metadata.checksum,
                        validated_at: validation.metadata.validated_at
                    };
                } catch (error) {
                    console.error('Validation error:', error);
                    // Continue without validation if service fails
                }
            }

            // Step 4: High confidence - Update to Validated
            const updatedMemory = await MemoryModel.updateEnhancement(memory.id, userId, {
                rawInput: enhancement.enhanced_text,
                category: enhancement.detected_category || 'generic',
                normalizedData: {
                    original_text: enhancement.raw_text,
                    ...enhancement.detected_entities,
                    enhancement_confidence: enhancement.confidence
                },
                confidenceScore: enhancement.confidence,
                status: 'validated'
            });

            // Step 4.5: Check for matching habits (NEW)
            let habitConfirmation = '';
            try {
                // A. Check for Completion of EXISTING habits
                const matchedHabit = await habitService.checkCompletionIntent(userId, enhancement.enhanced_text);

                if (matchedHabit) {
                    await habitService.logCompletion(matchedHabit.id, userId, true, enhancement.enhanced_text);
                    habitConfirmation = `\n✓ Checked off habit: "${matchedHabit.habit_name}"`;
                } else {
                    // B. Check for Creation of NEW habits (Fallback)
                    const newHabitData = await habitService.checkCreationIntent(userId, enhancement.enhanced_text);
                    if (newHabitData) {
                        const createdHabit = await habitService.createHabit(userId, newHabitData);
                        habitConfirmation = `\n✓ Created new habit: "${createdHabit.habit_name}" (${createdHabit.habit_type})`;
                    }
                }
            } catch (hError) {
                console.error('Habit check failed:', hError);
            }

            // Step 4.6: Update Action Plans (Context-Aware)
            let planConfirmation = '';
            if (enhancement.plan_updates && enhancement.plan_updates.length > 0) {
                for (const update of enhancement.plan_updates) {
                    if (update.is_fulfilled) {
                        try {
                            const updatedPlan = await PlanModel.updateProgress(
                                update.plan_id,
                                update.progress_value || 1,
                                update.progress_unit,
                                memory.id
                            );
                            if (updatedPlan) {
                                planConfirmation += `\n✓ Progress on plan: "${updatedPlan.plan_name}"`;
                            }
                        } catch (pErr) {
                            console.error('Failed to update plan progress:', pErr);
                        }
                    }
                }
            }

            // Generate success message
            const confirmation = `✓ Logged! ${enhancement.enhanced_text}${habitConfirmation}${planConfirmation}`;

            // Step 5: Engagement (Event-Driven) 🚀
            // Publishing to 'memory.created' triggers immediate feedback & delayed analysis
            try {
                await queue.send('memory.created', {
                    userId,
                    memoryId: memory.id,
                    text: enhancement.enhanced_text
                });
                console.log(`⚡ Event Published: memory.created for ${requestId || memory.id}`);
            } catch (qErr) {
                console.warn('Failed to publish memory.created:', qErr);
            }

            reply.code(201).send({
                success: true,
                data: {
                    auto_processed: true,
                    memory: updatedMemory,
                    enhancement: {
                        raw_text: enhancement.raw_text,
                        enhanced_text: enhancement.enhanced_text,
                        confidence: enhancement.confidence
                    },
                    confirmation
                }
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

            const userId = request.userId;

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
                data: {
                    memory,
                    confirmation: `✓ Logged! ${enhanced_text}`
                }
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
            const userId = request.userId;

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
            const userId = request.userId; // TODO: Get from auth

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
    /**
     * Process audio input with Gemini native audio support (Async)
     * POST /api/v1/input/audio
     */
    async processAudio(request, reply) {
        try {
            const userId = request.userId;

            // Import services
            const voiceQuotaService = (await import('../../services/quota/voiceQuotaService.js')).default;
            const storageService = (await import('../../services/storage/storageService.js')).default;

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

            // Validate audio size (max 10MB)
            const MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10 MB
            if (audioBuffer.length > MAX_AUDIO_SIZE) {
                return reply.code(400).send({
                    success: false,
                    error: `Audio file too large (max 10MB). Your file: ${Math.round(audioBuffer.length / 1024)}KB`
                });
            }

            const duration = parseInt(data.fields?.duration?.value || '6');
            let mimeType = data.mimetype;

            // Fix for octet-stream or missing mime type
            if (!mimeType || mimeType === 'application/octet-stream') {
                if (data.filename && data.filename.endsWith('.m4a')) {
                    mimeType = 'audio/mp4';
                } else {
                    mimeType = 'audio/mp3'; // Fallback
                }
            }

            request.log.info(`Uploading audio: ${mimeType}, ${duration}s, ${Math.round(audioBuffer.length / 1024)}KB`);

            // Step 1: Upload File
            const filename = `voice_${userId}_${Date.now()}.m4a`; // Assume m4a/mp4 container
            const uploadResult = await storageService.saveFile(audioBuffer, filename, mimeType);

            // Step 2: Create Memory (Processing Status)
            const memory = await MemoryModel.create({
                userId,
                rawInput: '[Audio Payload Processing]', // Temporary placeholder
                source: 'voice',
                eventType: 'user_log',
                category: 'generic',
                normalizedData: {
                    audio_path: uploadResult.key,
                    audio_url: uploadResult.url,
                    mime_type: mimeType,
                    duration: duration,
                    client_timestamp: new Date().toISOString()
                },
                confidenceScore: 0.0,
                status: 'processing'
            });

            // Return 202 Accepted immediately
            const responseData = {
                success: true,
                data: {
                    auto_processed: false, // Async
                    message: "Audio uploaded. Processing in background.",
                    quota: {
                        remaining: quotaCheck.remaining - 1 // Deduct 1 optimistically
                    }
                }
            };

            // Publish to Queue
            try {
                const jobId = await queue.send('process-memory', { memoryId: memory.id });
                console.log(`📤 Job Published: ${jobId} for Memory: ${memory.id}`);
            } catch (qErr) {
                console.error('❌ Queue Publish Failed:', qErr);
                // Potential fallback: retry logic or alert
            }

            reply.code(202).send(responseData);

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
