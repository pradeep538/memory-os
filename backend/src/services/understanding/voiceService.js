import speech from '@google-cloud/speech';
import config from '../../config/index.js';

class VoiceService {
    constructor() {
        // Initialize Speech-to-Text client
        if (config.googleCloud.credentials) {
            // Using service account JSON file
            this.client = new speech.SpeechClient({
                keyFilename: config.googleCloud.credentials
            });
        } else if (config.googleCloud.apiKey) {
            // Using API key
            this.client = new speech.SpeechClient({
                apiKey: config.googleCloud.apiKey
            });
        } else {
            console.warn('No Google Cloud credentials found. Voice transcription will not work.');
        }
    }

    /**
     * Transcribe audio to text using Google Speech-to-Text V2
     * @param {Buffer} audioBuffer - Audio file buffer
     * @param {string} encoding - Audio encoding (e.g., 'LINEAR16', 'WEBM_OPUS')
     * @param {number} sampleRateHertz - Sample rate (e.g., 16000, 48000)
     * @param {string} languageCode - Language code (e.g., 'en-US', 'hi-IN')
     */
    async transcribe(audioBuffer, options = {}) {
        if (!this.client) {
            throw new Error('Speech-to-Text client not initialized. Check Google Cloud credentials.');
        }

        const {
            encoding = 'WEBM_OPUS', // Common for web audio
            sampleRateHertz = 48000,
            languageCode = 'en-US',
            alternativeLanguages = ['hi-IN', 'en-IN'] // Support Hindi and Indian English
        } = options;

        const audio = {
            content: audioBuffer.toString('base64'),
        };

        const config = {
            encoding,
            sampleRateHertz,
            languageCode,
            alternativeLanguageCodes: alternativeLanguages,
            enableAutomaticPunctuation: true,
            model: 'latest_long', // Use latest model for better accuracy
            useEnhanced: true,
        };

        const request = {
            audio,
            config,
        };

        try {
            const [response] = await this.client.recognize(request);

            if (!response.results || response.results.length === 0) {
                return {
                    success: false,
                    text: '',
                    confidence: 0,
                    language: languageCode
                };
            }

            // Get the best transcription
            const transcription = response.results
                .map(result => result.alternatives[0])
                .filter(alt => alt.transcript)
                .map(alt => alt.transcript)
                .join(' ');

            const confidence = response.results[0]?.alternatives[0]?.confidence || 0;
            const detectedLanguage = response.results[0]?.languageCode || languageCode;

            return {
                success: true,
                text: transcription.trim(),
                confidence,
                language: detectedLanguage,
                raw: response.results
            };
        } catch (error) {
            console.error('Speech-to-Text error:', error);
            throw new Error(`Transcription failed: ${error.message}`);
        }
    }

    /**
     * Transcribe short audio (< 6 seconds for free tier)
     */
    async transcribeShort(audioBuffer, options = {}) {
        return this.transcribe(audioBuffer, {
            ...options,
            model: 'latest_short' // Optimized for short utterances
        });
    }
}

export default new VoiceService();
