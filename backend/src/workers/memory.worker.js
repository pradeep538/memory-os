
import MemoryModel from '../models/memory.model.js';
import storageService from '../services/storage/storageService.js';
import audioEnhancementService from '../services/input/audioEnhancementService.js';
import inputEnhancementService from '../services/input/inputEnhancementService.js';

export const QUEUE_NAME = 'process-memory';

/**
 * Main Job Handler for 'process-memory'
 */
export default async function processMemoryJob(jobOrJobs) {
    const jobs = Array.isArray(jobOrJobs) ? jobOrJobs : [jobOrJobs];

    for (const job of jobs) {
        console.log(`📥 Processing Job ${job.id}`);
        const { memoryId } = job.data || {};

        if (!memoryId) {
            console.error(`❌ Job ${job.id} missing memoryId. Data:`, job.data);
            continue;
        }

        console.log(`▶️ Processing Memory ID: ${memoryId}`);

        // Fetch memory
        const memory = await MemoryModel.findById(memoryId);
        if (!memory) {
            console.error(`❌ Memory ${memoryId} not found.`);
            continue;
        }

        console.log(`   Status: ${memory.status}, Source: ${memory.source}`);

        try {
            // SCENARIO 1: Audio Processing (New Upload)
            if (memory.source === 'voice' && memory.status === 'processing') {
                await processAudioMemory(memory);
            }
            // SCENARIO 2: Recovery/Retry
            else if (['transcribed', 'failed_enhancement'].includes(memory.status) || (memory.source === 'text' && memory.status === 'processing')) {
                await processTextRecovery(memory);
            }
        } catch (err) {
            console.error(`❌ Error in job logic for ${memoryId}:`, err);
            throw err; // Trigger retry for this job
        }
    }
}

/**
 * Handle Audio Processing
 */
export async function processAudioMemory(memory) {
    const audioPath = memory.normalized_data.audio_key || memory.normalized_data.audio_path;
    const mimeType = memory.normalized_data.mime_type;
    const duration = memory.normalized_data.duration;

    if (!audioPath) {
        throw new Error('Missing audio path in memory metadata');
    }

    // 1. Get File
    const audioBuffer = await storageService.getFile(audioPath);
    console.log(`   🎤 Retrieved audio: ${Math.round(audioBuffer.length / 1024)}KB`);

    // 2. Gemini Processing (STT + Enhance)
    const enhancement = await audioEnhancementService.enhanceFromAudio(audioBuffer, mimeType, duration);

    if (!enhancement.success) {
        throw new Error(enhancement.error || 'Gemini processing failed');
    }

    console.log(`   🗣️ Gemini STT Output: "${enhancement.transcription}"`);
    console.log(`   🧠 LLM Enhanced: "${enhancement.enhanced_text}"`);
    console.log(`   🏷️ Category: ${enhancement.detected_category}`);

    // 3. Checkpoint 1: Save Transcript
    await MemoryModel.updateEnhancement(memory.id, memory.user_id, {
        rawInput: enhancement.transcription,
        category: 'generic',
        normalizedData: {
            ...memory.normalized_data,
            original_transcription: enhancement.transcription,
        },
        confidenceScore: 0.0,
        status: 'transcribed'
    });

    // 4. Checkpoint 2: Save Full Enhancement
    console.log(`   ✨ Checkpoint 2: Saving enhancement...`);
    const status = enhancement.confidence >= 0.8 ? 'validated' : 'tentative';

    await MemoryModel.updateEnhancement(memory.id, memory.user_id, {
        rawInput: enhancement.enhanced_text,
        category: enhancement.detected_category,
        normalizedData: {
            ...memory.normalized_data,
            original_text: enhancement.transcription,
            ...enhancement.detected_entities,
            enhancement_confidence: enhancement.confidence
        },
        confidenceScore: enhancement.confidence,
        status: status
    });

    console.log(`   ✅ Memory ${memory.id} processing complete (${status})`);

    // Engagement Event 🚀
    try {
        await (await import('../lib/queue.js')).default.send('memory.created', {
            userId: memory.user_id,
            memoryId: memory.id,
            text: enhancement.enhanced_text
        });
    } catch (qErr) {
        console.warn('Failed to publish memory.created:', qErr);
        // Do not fail the job
    }
}

/**
 * Handle Text Recovery
 */
export async function processTextRecovery(memory) {
    const textToProcess = memory.raw_input;
    console.log(`   🔄 Recovering/Enhancing text: "${textToProcess.substring(0, 30)}..."`);

    const enhancement = await inputEnhancementService.enhance(textToProcess, memory.source || 'text');

    if (!enhancement.success) {
        throw new Error(enhancement.error);
    }

    const status = enhancement.confidence >= 0.8 ? 'validated' : 'tentative';

    await MemoryModel.updateEnhancement(memory.id, memory.user_id, {
        rawInput: enhancement.enhanced_text,
        category: enhancement.detected_category,
        normalizedData: {
            ...memory.normalized_data,
            original_text: enhancement.raw_text,
            ...enhancement.detected_entities,
            enhancement_confidence: enhancement.confidence
        },
        confidenceScore: enhancement.confidence,
        status: status
    });

    console.log(`   ✅ Recovery complete for ${memory.id} (${status})`);

    // Engagement Event 🚀
    try {
        await (await import('../lib/queue.js')).default.send('memory.created', {
            userId: memory.user_id,
            memoryId: memory.id,
            text: enhancement.enhanced_text
        });
    } catch (qErr) {
        console.warn('Failed to publish memory.created:', qErr);
    }
}
