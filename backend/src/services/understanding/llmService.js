import { GoogleGenAI } from '@google/genai';
import config from '../../config/index.js';

class LLMService {
    constructor() {
        if (!config.gemini.apiKey) {
            console.warn('No Gemini API key found. LLM features will not work.');
            return;
        }

        // New SDK: Single client object
        this.ai = new GoogleGenAI({
            apiKey: config.gemini.apiKey
        });
    }

    // Explicitly expose model accessor for other services
    get model() {
        return this.ai.models;
    }

    async evaluateNovelty(newPattern, historyContext, timezone = 'UTC') {
        const timeService = (await import('../time/timeService.js')).default;

        // Helper: Pre-calculate local time if pattern has time data
        let timeContext = "";
        if (newPattern.evidence?.peak_hour) {
            // Construct a dummy date at peak_hour UTC today
            const now = new Date();
            now.setUTCHours(newPattern.evidence.peak_hour, 0, 0, 0);
            const localTime = await timeService.formatTimeForUser(timezone, now, 'h:mm a');
            console.log(`   🕒 Time Logic: Peak ${newPattern.evidence.peak_hour} UTC -> ${localTime} (${timezone})`);
            timeContext = `(HINT: The pattern peak hour ${newPattern.evidence.peak_hour}:00 UTC corresponds to **${localTime}** in the user's timezone. Use this!)`;
        }

        const prompt = `
You are a "Novelty Engine" for a personal AI. 

CRITICAL INSTRUCTION: TIMEZONE CONVERSION
- The user is in: **${timezone}**.
- The data below is in **UTC**.
${timeContext}
- You MUST convert all times from UTC to **${timezone}** in your response.
- You MUST convert all times from UTC to **${timezone}** in your response.
- Example: If data says "08:00 UTC" and user is "America/New_York" (UTC-5), you must say "3:00 AM".
- NEVER say "UTC" in the final insight.

CONTEXT (Recent History):
${historyContext || "No recent history."}

NEW PATTERN DETECTED (Data is UTC):
- Description: ${newPattern.description}
- Stats: ${JSON.stringify(newPattern.evidence || {})}

TASK:
1. Is this Novel?
2. If YES, write a friendly insight.
   - **Check**: Did you convert the time to ${timezone}? if not, fix it.
3. If NOT NOVEL: Return null.

OUTPUT JSON ONLY:
{
  "isNovel": boolean,
  "insightText": "string or null",
  "reasoning": "string"
}
`;
        try {
            const response = await this.ai.models.generateContent({
                model: config.gemini.model || 'gemini-2.0-flash-exp',
                contents: prompt
            });

            let jsonText = response.text.trim();
            if (jsonText.startsWith('```json')) {
                jsonText = jsonText.slice(7, -3).trim();
            } else if (jsonText.startsWith('```')) {
                jsonText = jsonText.slice(3, -3).trim();
            }

            const result = JSON.parse(jsonText);
            return result;
        } catch (error) {
            console.error('LLM novelty evaluation error:', error);
            return {
                isNovel: false,
                insightText: null,
                reasoning: `Error during LLM evaluation: ${error.message}`
            };
        }
    }

    /**
     * Classify intent and extract entities from user input
     */
    async understand(rawInput) {
        const prompt = `
You are an AI that understands user inputs for a personal memory system. Extract structured information from the user's input.

User input: "${rawInput}"

Return ONLY a JSON object with this structure:
{
  "eventType": "activity" | "transaction" | "health" | "routine" | "note" | "event",
  "category": "fitness" | "finance" | "mindfulness" | "routine" | "health" | "generic",
  "entities": {
    "activity": string (if applicable),
    "amount": number (if money mentioned),
    "duration": number (if time mentioned, in minutes),
    "item": string (if specific item/object),
    "person": string (if person mentioned),
    "subcategory": string (if applicable)
  },
  "confidence": number (0-1, how confident you are)
}

Examples:
Input: "Did chest workout for 45 minutes"
Output: {"eventType": "activity", "category": "fitness", "entities": {"activity": "chest workout", "duration": 45}, "confidence": 0.95}

Input: "Paid ₹500 for groceries"
Output: {"eventType": "transaction", "category": "finance", "entities": {"amount": 500, "subcategory": "groceries"}, "confidence": 0.9}

Input: "Took vitamin C"
Output: {"eventType": "routine", "category": "routine", "entities": {"item": "vitamin C", "activity": "took vitamin C"}, "confidence": 0.95}

Input: "Meditated for 20 minutes"
Output: {"eventType": "activity", "category": "mindfulness", "entities": {"activity": "meditation", "duration": 20}, "confidence": 0.95}

Now process the user input and return ONLY the JSON.
`;

        try {
            // New SDK: Use ai.models.generateContent()
            const response = await this.ai.models.generateContent({
                model: config.gemini.model || 'gemini-2.0-flash-exp',
                contents: prompt
            });

            // New SDK: response.text directly available
            const text = response.text;

            // Extract JSON from response (handle markdown code blocks)
            let jsonText = text.trim();
            if (jsonText.startsWith('```json')) {
                jsonText = jsonText.slice(7, -3).trim();
            } else if (jsonText.startsWith('```')) {
                jsonText = jsonText.slice(3, -3).trim();
            }

            const understanding = JSON.parse(jsonText);

            return {
                eventType: understanding.eventType,
                category: understanding.category,
                entities: understanding.entities || {},
                confidence: understanding.confidence || 0.7
            };
        } catch (error) {
            console.error('LLM understanding error:', error);

            // Fallback to simple keyword matching
            return this.fallbackUnderstanding(rawInput);
        }
    }

    /**
     * Fallback understanding when LLM fails
     */
    fallbackUnderstanding(input) {
        const lowerInput = input.toLowerCase();

        // Simple keyword matching
        if (lowerInput.includes('workout') || lowerInput.includes('exercise') || lowerInput.includes('gym')) {
            return {
                eventType: 'activity',
                category: 'fitness',
                entities: { activity: input },
                confidence: 0.5
            };
        }

        if (lowerInput.includes('paid') || lowerInput.includes('spent') || lowerInput.includes('₹') || lowerInput.includes('rs')) {
            return {
                eventType: 'transaction',
                category: 'finance',
                entities: {},
                confidence: 0.5
            };
        }

        if (lowerInput.includes('meditat') || lowerInput.includes('yoga') || lowerInput.includes('breathe')) {
            return {
                eventType: 'activity',
                category: 'mindfulness',
                entities: { activity: input },
                confidence: 0.5
            };
        }

        if (lowerInput.includes('took') || lowerInput.includes('water')) {
            return {
                eventType: 'routine',
                category: 'routine',
                entities: { item: input },
                confidence: 0.5
            };
        }

        // Default to generic
        return {
            eventType: 'note',
            category: 'generic',
            entities: { note: input },
            confidence: 0.3
        };
    }

    /**
     * Generate structured response from LLM
     * Used by enhancement service
     */
    async generateStructuredResponse(prompt) {
        try {
            // New SDK
            const response = await this.ai.models.generateContent({
                model: config.gemini.model || 'gemini-2.0-flash-exp',
                contents: prompt
            });

            return response.text;
        } catch (error) {
            console.error('LLM generation error:', error);
            throw new Error('Failed to generate LLM response');
        }
    }

    /**
     * Generate natural language response
     */
    async generateResponse(context, data) {
        const prompt = `
You are a helpful personal AI assistant. Generate a brief, friendly confirmation message.

Context: ${context}
Data: ${JSON.stringify(data)}

Generate a single sentence confirmation that sounds natural and personal. Be concise.
`;

        try {
            // New SDK
            const response = await this.ai.models.generateContent({
                model: config.gemini.model || 'gemini-2.0-flash-exp',
                contents: prompt
            });

            return response.text.trim();
        } catch (error) {
            return `Got it! Logged: ${data.activity || data.note || 'your input'}`;
        }
    }
}

export default new LLMService();
