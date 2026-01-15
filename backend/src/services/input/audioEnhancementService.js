import { GoogleGenAI } from '@google/genai';
import config from '../../config/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Audio Enhancement Service
 * 
 * Uses Gemini's native audio support to:
 * 1. Upload audio file
 * 2. Transcribe + enhance + extract entities in one call
 * 3. Calculate confidence score
 */
class AudioEnhancementService {
    constructor() {
        if (!config.gemini.apiKey) {
            console.warn('No Gemini API key found. Audio features will not work.');
            return;
        }

        this.ai = new GoogleGenAI({
            apiKey: config.gemini.apiKey
        });

        // Temp directory for audio processing
        this.tempDir = path.join(__dirname, '../../../temp');
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    /**
     * Process audio directly with Gemini
     * @param {Buffer} audioBuffer - Audio file buffer
     * @param {string} mimeType - Audio MIME type (audio/webm, audio/mp3, audio/wav)
     * @param {number} duration - Duration in seconds
     */
    async enhanceFromAudio(audioBuffer, mimeType, duration) {
        let tempPath = null;

        try {
            // Step 1: Save buffer to temp file
            const filename = `audio_${Date.now()}.${this.getExtension(mimeType)}`;
            tempPath = path.join(this.tempDir, filename);
            fs.writeFileSync(tempPath, audioBuffer);

            // Step 2: Upload to Gemini Files API
            console.log('Uploading audio to Gemini Files API...');
            const audioFile = await this.ai.files.upload({
                file: tempPath,
                mimeType: mimeType,
                displayName: `voice_input_${Date.now()}`
            });

            console.log('Audio uploaded:', audioFile.uri);

            // Step 3: Wait for file to be processed
            await this.waitForFileProcessing(audioFile.name);

            // Step 4: Process with Gemini
            const prompt = this.buildAudioEnhancementPrompt();

            console.log('Processing audio with Gemini...');
            const response = await this.ai.models.generateContent({
                model: config.gemini.model || 'gemini-2.0-flash-lite',
                contents: [
                    {
                        role: 'user',
                        parts: [
                            { text: prompt },
                            {
                                fileData: {
                                    mimeType: audioFile.mimeType,
                                    fileUri: audioFile.uri
                                }
                            }
                        ]
                    }
                ]
            });

            console.log('Gemini response received');

            // Step 5: Parse response
            const result = this.parseAudioResponse(response.text);

            // Step 6: Calculate confidence
            result.confidence = this.calculateConfidence(result, duration);

            // Step 7: Cleanup
            try {
                await this.ai.files.delete(audioFile.name);
                console.log('Cleaned up uploaded file');
            } catch (cleanupError) {
                console.warn('Failed to delete uploaded file:', cleanupError.message);
            }

            return {
                success: true,
                ...result
            };

        } catch (error) {
            console.error('Audio enhancement error:', error);
            return {
                success: false,
                error: error.message,
                fallback: true
            };
        } finally {
            // Always cleanup temp file
            if (tempPath && fs.existsSync(tempPath)) {
                try {
                    fs.unlinkSync(tempPath);
                } catch (e) {
                    console.warn('Failed to delete temp file:', e.message);
                }
            }
        }
    }

    /**
     * Wait for Gemini to process uploaded file
     */
    async waitForFileProcessing(fileName, maxAttempts = 10) {
        for (let i = 0; i < maxAttempts; i++) {
            const file = await this.ai.files.get(fileName);

            if (file.state === 'ACTIVE') {
                return file;
            }

            if (file.state === 'FAILED') {
                throw new Error('File processing failed');
            }

            // Wait 1 second before next attempt
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        throw new Error('File processing timeout');
    }

    /**
     * Build enhancement prompt for audio
     */
    buildAudioEnhancementPrompt() {
        return `You are processing a voice recording from a user logging their daily activities.

Your task:
1. Transcribe the audio accurately
2. Enhance the transcription to be grammatically complete
3. Extract key entities and information
4. Detect the activity category

Respond ONLY with valid JSON in this exact format:
{
  "transcription": "exact words spoken",
  "enhanced_text": "grammatically complete sentence",
  "detected_category": "fitness|finance|routine|health|mindfulness|generic",
  "detected_entities": {
    "duration_minutes": number or null,
    "amount": number or null,
    "activity_type": "string or null",
    "location": "string or null",
    "intensity": "string or null",
    "mood": "string or null"
  },
  "semantic_confidence": 0.0 to 1.0,
  "audio_quality": "excellent|good|fair|poor",
  "reasoning": "brief explanation"
}

Examples:

Audio: "went to the gym did leg workout for about an hour"
Output: {
  "transcription": "went to the gym did leg workout for about an hour",
  "enhanced_text": "Went to the gym and did a leg workout for about 1 hour",
  "detected_category": "fitness",
  "detected_entities": {
    "duration_minutes": 60,
    "activity_type": "leg workout",
    "location": "gym",
    "intensity": null,
    "mood": null
  },
  "semantic_confidence": 0.95,
  "audio_quality": "excellent",
  "reasoning": "Clear fitness activity with duration and location"
}

Audio: "spent forty five dollars on groceries"
Output: {
  "transcription": "spent forty five dollars on groceries",
  "enhanced_text": "Spent $45 on groceries",
  "detected_category": "finance",
  "detected_entities": {
    "amount": 45,
    "activity_type": "purchase",
    "location": null
  },
  "semantic_confidence": 0.85,
  "audio_quality": "good",
  "reasoning": "Clear transaction with amount"
}

Now process the audio and respond ONLY with JSON.`;
    }

    /**
     * Parse Gemini audio response
     */
    parseAudioResponse(responseText) {
        try {
            let jsonText = responseText.trim();

            // Handle markdown code blocks
            if (jsonText.includes('```json')) {
                jsonText = jsonText.split('```json')[1].split('```')[0].trim();
            } else if (jsonText.includes('```')) {
                jsonText = jsonText.split('```')[1].split('```')[0].trim();
            }

            const parsed = JSON.parse(jsonText);

            return {
                transcription: parsed.transcription || '',
                enhanced_text: parsed.enhanced_text || parsed.transcription || '',
                detected_category: parsed.detected_category || 'generic',
                detected_entities: parsed.detected_entities || {},
                semantic_confidence: parsed.semantic_confidence || 0.5,
                audio_quality: parsed.audio_quality || 'unknown',
                reasoning: parsed.reasoning || ''
            };
        } catch (error) {
            console.error('Failed to parse audio response:', error);
            console.error('Response was:', responseText);

            return {
                transcription: '',
                enhanced_text: '',
                detected_category: 'generic',
                detected_entities: {},
                semantic_confidence: 0.3,
                audio_quality: 'unknown',
                reasoning: 'Parse error',
                parse_error: error.message
            };
        }
    }

    /**
     * Calculate confidence score
     */
    calculateConfidence(result, duration) {
        let baseConfidence = result.semantic_confidence || 0.5;

        // Factor 1: Semantic confidence from LLM (40%)
        const semanticScore = baseConfidence * 0.4;

        // Factor 2: Audio quality (20%)
        const qualityScore = {
            'excellent': 0.2,
            'good': 0.15,
            'fair': 0.1,
            'poor': 0.05,
            'unknown': 0.08
        }[result.audio_quality] || 0.08;

        // Factor 3: Entity extraction (20%)
        const entities = result.detected_entities || {};
        const entityCount = Object.keys(entities).filter(k => entities[k] !== null && entities[k] !== undefined).length;
        const entityScore = Math.min(entityCount / 3, 1.0) * 0.2;

        // Factor 4: Category confidence (10%)
        const categoryScore = (result.detected_category && result.detected_category !== 'generic') ? 0.1 : 0.05;

        // Factor 5: Duration appropriateness (10%)
        // Too short (<1s) or too long (>30s) reduces confidence
        let durationScore = 0.1;
        if (duration < 1) durationScore = 0.03;
        else if (duration > 30) durationScore = 0.05;

        // Total confidence
        const totalConfidence = semanticScore + qualityScore + entityScore + categoryScore + durationScore;

        // Clamp between 0 and 1
        return Math.max(0, Math.min(1, totalConfidence));
    }

    /**
     * Get file extension from MIME type
     */
    getExtension(mimeType) {
        const map = {
            'audio/webm': 'webm',
            'audio/mp3': 'mp3',
            'audio/mpeg': 'mp3',
            'audio/wav': 'wav',
            'audio/ogg': 'ogg',
            'audio/opus': 'opus'
        };

        return map[mimeType] || 'webm';
    }
}

export default new AudioEnhancementService();
