import llmService from './llmService.js';
import voiceService from './voiceService.js';
import UserModel from '../../models/user.model.js';

class InputService {
    /**
     * Process text input
     */
    async processText(userId, rawInput) {
        // 1. Understand the input using Gemini
        const understanding = await llmService.understand(rawInput);

        // 2. Build normalized data
        const normalizedData = {
            ...understanding.entities,
            original_input: rawInput
        };

        return {
            rawInput,
            source: 'text',
            eventType: understanding.eventType,
            category: understanding.category,
            normalizedData,
            confidenceScore: understanding.confidence
        };
    }

    /**
     * Process voice input (audio buffer)
     */
    async processVoice(userId, audioBuffer, audioMetadata = {}) {
        // 1. Check subscription tier and usage limits
        const user = await UserModel.findById(userId);

        if (user.subscription_tier === 'free') {
            const todayUsage = await UserModel.getUsageStats(userId, 'voice_inputs', 'daily');
            if (todayUsage >= 5) {
                throw new Error('Daily voice input limit reached (5/day). Upgrade to Pro for unlimited voice input.');
            }
        }

        // 2. Transcribe audio to text
        const transcription = await voiceService.transcribe(audioBuffer, {
            encoding: audioMetadata.encoding || 'WEBM_OPUS',
            sampleRateHertz: audioMetadata.sampleRate || 48000,
            languageCode: audioMetadata.language || 'en-US'
        });

        if (!transcription.success || !transcription.text) {
            throw new Error('Could not transcribe audio. Please try again.');
        }

        // 3. Increment usage counter (only after successful transcription)
        if (user.subscription_tier === 'free') {
            await UserModel.incrementUsage(userId, 'voice_inputs', 'daily');
        }

        // 4. Understand the transcribed text
        const understanding = await llmService.understand(transcription.text);

        // 5. Build normalized data with transcription metadata
        const normalizedData = {
            ...understanding.entities,
            original_input: transcription.text,
            transcription_confidence: transcription.confidence,
            detected_language: transcription.language
        };

        return {
            rawInput: transcription.text,
            source: 'voice',
            eventType: understanding.eventType,
            category: understanding.category,
            normalizedData,
            confidenceScore: understanding.confidence * transcription.confidence, // Combined confidence
            transcriptionMeta: {
                confidence: transcription.confidence,
                language: transcription.language
            }
        };
    }

    /**
     * Validate input before processing
     */
    validateTextInput(text) {
        if (!text || typeof text !== 'string') {
            throw new Error('Invalid input: text must be a non-empty string');
        }

        if (text.trim().length === 0) {
            throw new Error('Invalid input: text cannot be empty');
        }

        if (text.length > 1000) {
            throw new Error('Invalid input: text too long (max 1000 characters)');
        }

        return true;
    }

    /**
     * Validate voice input
     */
    validateVoiceInput(audioBuffer) {
        if (!Buffer.isBuffer(audioBuffer)) {
            throw new Error('Invalid input: audio must be a Buffer');
        }

        // Check file size (max 10MB)
        if (audioBuffer.length > 10 * 1024 * 1024) {
            throw new Error('Invalid input: audio file too large (max 10MB)');
        }

        // Free tier: max 6 seconds (approximate)
        // At 48kHz, 6 seconds ≈ 576KB for compressed audio
        // We'll be lenient and allow up to 1MB for free tier
        return true;
    }
}

export default new InputService();
