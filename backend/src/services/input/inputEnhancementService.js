import llmService from '../understanding/llmService.js';

/**
 * Input Enhancement Service
 * 
 * Transforms casual voice/text input into complete, syntactically correct sentences
 * Uses LLM to fill in context, fix grammar, and extract entities
 */
class InputEnhancementService {

    /**
     * Enhance raw user input
     * @param {string} rawText - Raw transcription or typed text
     * @param {string} source - 'voice' or 'text'
     * @returns {Promise<EnhancementResult>}
     */
    async enhance(rawText, source = 'text') {
        if (!rawText || rawText.trim().length < 2) {
            return {
                success: false,
                error: 'Input too short',
                confidence: 0
            };
        }

        try {
            // Build enhancement prompt
            const prompt = this.buildEnhancementPrompt(rawText);

            // Call LLM
            const llmResponse = await llmService.generateStructuredResponse(prompt);

            // Parse and validate response
            const result = this.parseEnhancementResponse(llmResponse, rawText);

            // Calculate final confidence score
            result.confidence = this.calculateConfidence(result, source);

            return {
                success: true,
                ...result
            };
        } catch (error) {
            console.error('Enhancement error:', error);

            // Fallback to raw text
            return {
                success: true,
                enhanced_text: rawText,
                raw_text: rawText,
                confidence: 0.4, // Low confidence for fallback
                detected_category: 'generic',
                detected_entities: {},
                fallback: true,
                error: error.message
            };
        }
    }

    /**
     * Build LLM enhancement prompt
     */
    buildEnhancementPrompt(rawText) {
        return `You are an intelligent life tracking assistant. A user has logged an activity using casual, incomplete speech or text.

Your task:
1. Transform the input into a complete, natural sentence
2. Fill in implied context (articles, prepositions, etc.)
3. Fix grammar and syntax
4. Keep it concise (1-2 sentences max)
5. Maintain the original meaning - don't add information not implied
6. Extract key entities (duration, amount, category, etc.)

Input: "${rawText}"

Respond ONLY with valid JSON in this exact format:
{
  "enhanced_text": "Complete, grammatically correct sentence",
  "detected_category": "fitness|finance|routine|health|mindfulness|generic",
  "detected_entities": {
    "duration_minutes": number or null,
    "amount": number or null,
    "activity_type": "string or null",
    "location": "string or null",
    "intensity": "string or null",
    "mood": "string or null",
    "category_specific": {}
  },
  "semantic_confidence": 0.0 to 1.0,
  "reasoning": "Brief explanation of interpretation"
}

Examples:

Input: "went gym leg workout hour"
Output: {
  "enhanced_text": "Went to gym for leg workout for 1 hour",
  "detected_category": "fitness",
  "detected_entities": {
    "duration_minutes": 60,
    "activity_type": "leg workout",
    "location": "gym"
  },
  "semantic_confidence": 0.95,
  "reasoning": "Clear fitness activity with duration and location"
}

Input: "spent forty groceries"
Output: {
  "enhanced_text": "Spent $40 on groceries",
  "detected_category": "finance",
  "detected_entities": {
    "amount": 40,
    "category_specific": {"subcategory": "groceries"}
  },
  "semantic_confidence": 0.7,
  "reasoning": "Likely expense but unclear if $40 or $40.00"
}

Input: "did thing morning"
Output: {
  "enhanced_text": "Did something this morning",
  "detected_category": "generic",
  "detected_entities": {},
  "semantic_confidence": 0.3,
  "reasoning": "Too vague, multiple interpretations possible"
}

Now process the user input and respond ONLY with JSON.`;
    }

    /**
     * Parse LLM response
     */
    parseEnhancementResponse(llmResponse, rawText) {
        try {
            // Extract JSON from response (handle markdown code blocks)
            let jsonText = llmResponse.trim();

            if (jsonText.includes('```json')) {
                jsonText = jsonText.split('```json')[1].split('```')[0].trim();
            } else if (jsonText.includes('```')) {
                jsonText = jsonText.split('```')[1].split('```')[0].trim();
            }

            const parsed = JSON.parse(jsonText);

            return {
                enhanced_text: parsed.enhanced_text || rawText,
                raw_text: rawText,
                detected_category: parsed.detected_category || 'generic',
                detected_entities: parsed.detected_entities || {},
                semantic_confidence: parsed.semantic_confidence || 0.5,
                reasoning: parsed.reasoning || ''
            };
        } catch (error) {
            console.error('Failed to parse LLM response:', error);
            console.error('Response was:', llmResponse);

            // Return raw text as fallback
            return {
                enhanced_text: rawText,
                raw_text: rawText,
                detected_category: 'generic',
                detected_entities: {},
                semantic_confidence: 0.3,
                reasoning: 'Failed to parse LLM response',
                parse_error: error.message
            };
        }
    }

    /**
     * Calculate final confidence score
     * Combines semantic confidence with other factors
     */
    calculateConfidence(result, source) {
        let baseConfidence = result.semantic_confidence || 0.5;

        // Factor 1: Semantic confidence from LLM (40%)
        const semanticScore = baseConfidence * 0.4;

        // Factor 2: Entity extraction completeness (30%)
        const entities = result.detected_entities || {};
        const entityCount = Object.keys(entities).filter(k => entities[k] !== null).length;
        const entityScore = Math.min(entityCount / 3, 1.0) * 0.3;

        // Factor 3: Category confidence (20%)
        const categoryScore = (result.detected_category && result.detected_category !== 'generic') ? 0.2 : 0.1;

        // Factor 4: Source bonus (10%)
        // Text input typically more intentional = slight bonus
        const sourceScore = (source === 'text') ? 0.1 : 0.08;

        // Total confidence
        const totalConfidence = semanticScore + entityScore + categoryScore + sourceScore;

        // Clamp between 0 and 1
        return Math.max(0, Math.min(1, totalConfidence));
    }

    /**
     * Determine if input needs confirmation based on confidence
     */
    needsConfirmation(confidence, userThreshold = 0.8) {
        return confidence < userThreshold;
    }

    /**
     * Generate suggestions for ambiguous input
     */
    async generateSuggestions(rawText) {
        const prompt = `The user said: "${rawText}"

This is ambiguous. Generate 3 possible interpretations:

Respond with JSON:
{
  "suggestions": [
    {"text": "interpretation 1", "category": "category"},
    {"text": "interpretation 2", "category": "category"},
    {"text": "interpretation 3", "category": "category"}
  ]
}`;

        try {
            const response = await llmService.generateStructuredResponse(prompt);
            const parsed = JSON.parse(response.replace(/```json|```/g, '').trim());
            return parsed.suggestions || [];
        } catch (error) {
            console.error('Failed to generate suggestions:', error);
            return [];
        }
    }

    /**
     * Batch enhance multiple inputs (for offline sync)
     */
    async batchEnhance(inputs) {
        const results = [];

        for (const input of inputs) {
            const result = await this.enhance(input.text, input.source);
            results.push({
                id: input.id,
                ...result
            });
        }

        return results;
    }
}

export default new InputEnhancementService();
