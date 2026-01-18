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
 * 4. Classify intent (Log vs Query)
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
        console.log(`Processing audio: ${mimeType}, Size: ${(audioBuffer.length / 1024).toFixed(2)} KB, Duration: ${duration}s`);

        if (!this.ai) {
            console.error('❌ AudioExhancementService: No Gemini API Key configured.');
            return {
                success: false,
                error: 'Missing Gemini API Key',
                transcription: 'Audio processing unavailable (Missing Key)',
                category: 'generic',
                confidence: 0,
                fallback: true
            };
        }

        let tempPath = null;

        try {
            // Step 1: Force Files API (Inline data is notoriously flaky for AAC/MP4 containers)
            const MAX_INLINE_SIZE = 0; // Force upload
            const isSmallFile = false; // audioBuffer.length < MAX_INLINE_SIZE;

            let response = null;

            // Gemini API doesn't explicitly support audio/mp4, but supports audio/aac.
            // Flutter sends audio/mp4 (AAC-LC). We remap specifically for the API call.
            let apiMimeType = mimeType;
            // if (mimeType === 'audio/mp4' || mimeType === 'audio/x-m4a') {
            //     apiMimeType = 'audio/aac';
            // }
            // Add MP4/AAC file extension support
            const extension = this.getExtension(mimeType);

            if (isSmallFile) {
                console.log(`File is small (<10MB), using inline processing as ${apiMimeType}...`);
                const base64Audio = audioBuffer.toString('base64');

                try {
                    const prompt = this.buildAudioEnhancementPrompt();
                    response = await this.ai.models.generateContent({
                        model: config.gemini.model || 'gemini-2.0-flash-lite',
                        contents: [
                            {
                                role: 'user',
                                parts: [
                                    { text: prompt },
                                    {
                                        inlineData: {
                                            mimeType: apiMimeType,
                                            data: base64Audio
                                        }
                                    }
                                ]
                            }
                        ]
                    });
                } catch (err) {
                    console.error('Inline processing error:', err);
                    throw err;
                }

            } else {
                // Large file path: Upload to Files API
                console.log('Using Gemini Files API for reliable processing (Forcing for all audio)...');

                // Step 1: Save buffer to temp file
                const filename = `audio_${Date.now()}.${this.getExtension(mimeType)}`;
                tempPath = path.join(this.tempDir, filename);
                fs.writeFileSync(tempPath, audioBuffer);

                // Step 2: Upload to Gemini Files API
                console.log('Uploading audio to Gemini Files API...');
                const audioFile = await this.ai.files.upload({
                    file: tempPath,
                    config: {
                        mimeType: apiMimeType,
                        displayName: `voice_input_${Date.now()}`
                    }
                });

                console.log('Audio uploaded:', audioFile.uri);

                // Step 3: Wait briefly for file to be available
                console.log('Waiting for file processing...');
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Step 4: Process with Gemini
                const prompt = this.buildAudioEnhancementPrompt();

                let attempts = 0;
                const maxAttempts = 15;

                while (attempts < maxAttempts) {
                    try {
                        response = await this.ai.models.generateContent({
                            model: config.gemini.model || 'gemini-2.0-flash-lite',
                            contents: [
                                {
                                    role: 'user',
                                    parts: [
                                        { text: prompt },
                                        {
                                            fileData: {
                                                mimeType: apiMimeType,
                                                fileUri: audioFile.uri
                                            }
                                        }
                                    ]
                                }
                            ]
                        });
                        break; // Success
                    } catch (err) {
                        if (err.message && (err.message.includes('not in an ACTIVE state') || err.message.includes('FAILED_PRECONDITION'))) {
                            attempts++;
                            console.log(`File not ready (Attempt ${attempts}/${maxAttempts}). Waiting...`);
                            await new Promise(resolve => setTimeout(resolve, 2000));
                        } else {
                            throw err; // Other error
                        }
                    }
                }

                if (!response) {
                    throw new Error('Timeout waiting for file to be active');
                }

                // Cleanup uploaded file
                try {
                    await this.ai.files.delete({ name: audioFile.name });
                    console.log('Cleaned up uploaded file');
                } catch (cleanupError) {
                    console.warn('Failed to delete uploaded file:', cleanupError.message);
                }
            }

            console.log('Gemini response received');

            // Step 5: Parse response
            const result = this.parseAudioResponse(response.text);

            // Step 6: Calculate confidence
            result.confidence = this.calculateConfidence(result, duration);
            console.log(`Confidence calculated: ${result.confidence}`);

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
     * Wait for Gemini to process uploaded file (Deprecated: causing SDK issues)
     */
    async waitForFileProcessing(fileName, maxAttempts = 10) {
        // Skipping explicit check due to SDK bug
        return true;
    }

    /**
     * Build enhancement prompt for audio
     */
    buildAudioEnhancementPrompt() {
        return `You are an intelligent assistant processing voice input.

Your task:
1. Transcribe the audio accurately
2. Classify intent: "log" (logging a memory/activity) OR "query" (asking a question/requesting info)
3. Enhance the transcription to be grammatically complete
4. Extract key entities and information
5. Detect the activity category (if intent is "log")

Respond ONLY with valid JSON in this exact format:
{
  "transcription": "exact words spoken",
  "intent": "log" | "query",
  "enhanced_text": "grammatically complete sentence",
  "detected_category": "fitness|finance|routine|health|mindfulness|generic",
  "detected_entities": {
    "duration_minutes": number or null,
    "amount": number or null,
    "activity_type": "string or null",
    "location": "string or null",
    "intensity": "string or null",
    "mood": "string or null",
    "event_date": "ISO8601 date string (YYYY-MM-DD) if explicitly mentioned (e.g. 'yesterday', 'last friday', 'jan 1st') else null"
  },
  "semantic_confidence": 0.0 to 1.0,
  "audio_quality": "excellent|good|fair|poor",
  "confirmation_message": "Short, crisp first-person confirmation",
  "reasoning": "brief explanation",
  "is_speech": boolean
}

CRITICAL RULES:
1. If the input is a question like "How much did I spend?" or "Show me my workouts", set "intent" to "query".
2. If the input is a statement like "I spent $50" or "I went running", set "intent" to "log".
3. If the audio is completely silent or noise, set "is_speech" to false.
4. **SMART NUMBER EXTRACTION**: Context is key.
   - "Spent 500" (No unit) -> 'amount: 500' (Finance)
   - "Spent 5 hours" -> 'duration_minutes: 300' (Activity, NOT Finance)
   - "Ran 5 km" -> 'distance: 5', 'amount: null'
5. **FINANCIAL TRIGGERS**: "spent", "paid", "cost", "bought" -> strongly imply Finance UNLESS the unit is explicitly time.
6. **MANDATORY**: If the context is clearly financial (e.g. "paid for taxi"), you MUST extract the number as 'amount'.
7. **UNIT CONVERSION**:
   - "10k" -> amount: 10000
   - "5M" -> amount: 5000000
   - "Half a million" -> amount: 500000
   - "20,000" -> amount: 20000 (REMOVE COMMAS)
8. **NUMERIC FORMAT**: 'amount' must be a pure number (no strings, no commas).

Examples:

Audio: "How much did I spend on food?"
Output: {
  "transcription": "How much did I spend on food?",
  "intent": "query",
  "enhanced_text": "How much did I spend on food?",
  "detected_category": "finance",
  "semantic_confidence": 0.95
}

Audio: "I spent 800 at Starbucks"
Output: {
  "transcription": "I spent 800 at Starbucks",
  "intent": "log",
  "enhanced_text": "I spent 800 at Starbucks.",
  "detected_category": "finance",
  "detected_entities": {
    "amount": 800,
    "activity_type": "expense",
    "location": "Starbucks"
  },
  "semantic_confidence": 0.99
}

Audio: "Paid 50 for taxi"
Output: {
  "transcription": "Paid 50 for taxi",
  "intent": "log",
  "enhanced_text": "Paid 50 for taxi.",
  "detected_category": "finance",
  "detected_entities": {
    "amount": 50,
    "activity_type": "expense",
    "location": "taxi"
  },
  "semantic_confidence": 0.98
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
                intent: parsed.intent || 'log', // Default to log if undefined
                enhanced_text: parsed.enhanced_text || parsed.transcription || '',
                detected_category: parsed.detected_category || 'generic',
                detected_entities: parsed.detected_entities || {},
                semantic_confidence: parsed.semantic_confidence || 0.5,
                audio_quality: parsed.audio_quality || 'unknown',
                confirmation_message: parsed.confirmation_message || parsed.enhanced_text || 'Logged',
                reasoning: parsed.reasoning || '',
                is_speech: parsed.is_speech !== false // Default to true unless explicitly false
            };
        } catch (error) {
            console.error('Failed to parse audio response:', error);
            console.error('Response was:', responseText);

            return {
                transcription: '',
                intent: 'log',
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
            'audio/opus': 'opus',
            'audio/aac': 'aac',
            'audio/mp4': 'm4a',
            'audio/x-m4a': 'm4a'
        };

        return map[mimeType] || 'webm';
    }
}

export default new AudioEnhancementService();
