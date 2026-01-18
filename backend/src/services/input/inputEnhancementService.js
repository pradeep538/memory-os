import llmService from '../understanding/llmService.js';
import PlanModel from '../../models/plan.model.js';

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
     * @param {string} userId - User ID for context (optional but recommended)
     * @returns {Promise<EnhancementResult>}
     */
    async enhance(rawText, source = 'text', userId = null) {
        if (!rawText || rawText.trim().length < 2) {
            return {
                success: false,
                error: 'Input too short',
                confidence: 0
            };
        }

        try {
            // Fetch active plans if userId is provided
            let activePlans = [];
            if (userId) {
                try {
                    activePlans = await PlanModel.findActive(userId);
                } catch (err) {
                    console.warn('Failed to fetch active plans for context:', err.message);
                }
            }

            // Build enhancement prompt with Plan Context
            const prompt = this.buildEnhancementPrompt(rawText, activePlans);

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
                intent: 'LOGGING',
                is_query: false,
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
     * Build LLM enhancement prompt with Action Plan Context
     */
    buildEnhancementPrompt(rawText, activePlans = []) {
        // Construct Plan Context String
        let planContext = "No active plans.";
        if (activePlans.length > 0) {
            planContext = activePlans.map(p =>
                `- Plan ID: "${p.id}", Goal: "${p.plan_name}", Category: "${p.category}"`
            ).join("\n");
        }

        return `You are an intelligent life tracking assistant.
Input: "${rawText}"

CONTEXT: The user has these ACTIVE BLUEPRINTS (Action Plans):
${planContext}

Your task:
1. **CRITICAL: Classify INTENT**
   - "QUERY": User is asking for status, history, totals, or checking facts (e.g., "What did I...?", "When was...?", "Did I...?", "How much...?", "Total...?")
   - "LOGGING": User is stating an action performed or a note to save (e.g., "I ate...", "Logged...", "Note that...")
2. Transform into a complete natural sentence.
3. Fill context & fix grammar.
4. Match to Active Blueprints if applicable.

Respond ONLY with valid JSON in this exact format:
{
  "intent": "QUERY" | "LOGGING",
  "is_query": boolean,
  "enhanced_text": "string",
  "detected_category": "string",
  "detected_entities": {},
  "plan_updates": [],
  "semantic_confidence": number,
  "confirmation_message": "string",
  "reasoning": "string"
}
`;
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
            const rawIntent = (parsed.intent || 'LOGGING').toUpperCase().trim();
            const isQueryLLM = rawIntent === 'QUERY' || parsed.is_query === true;

            // Deterministic signals for queries (Fallback/Safety)
            const queryRegex = /^(what|when|where|how|did|have|who|which)\b/i;
            const hasQuerySignal = queryRegex.test(rawText.trim());

            return {
                intent: (isQueryLLM || hasQuerySignal) ? 'QUERY' : rawIntent,
                is_query: isQueryLLM || hasQuerySignal,
                enhanced_text: parsed.enhanced_text || rawText,
                raw_text: rawText,
                detected_category: parsed.detected_category || 'generic',
                detected_entities: parsed.detected_entities || {},
                plan_updates: parsed.plan_updates || [],
                semantic_confidence: parsed.semantic_confidence || 0.5,
                confirmation_message: parsed.confirmation_message || parsed.enhanced_text || 'Logged',
                reasoning: parsed.reasoning || ''
            };
        } catch (error) {
            console.error('Failed to parse LLM response:', error);
            console.error('Response was:', llmResponse);

            // Return raw text as fallback
            return {
                intent: 'LOGGING',
                is_query: false,
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

    /**
     * Enhance Blueprint Goal and Derive Name
     * Asks LLM to polish the goal and suggest a short title.
     */
    async enhanceBlueprintGoal(rawGoal) {
        const prompt = `Refine this goal into a clear statement.
Input: "${rawGoal}"

Rules:
1. Make it actionable but DO NOT add specific frequencies (like "3 times a week") unless the user explicitly stated them.
2. If no frequency is given, use general terms like "regularly" or "consistently".
3. Suggest a short 2-4 word title (Noun Phrase).

Respond ONLY with valid JSON:
{
  "refined_goal": "Refined goal string",
  "short_name": "Short Title"
}`;

        try {
            const response = await llmService.generateStructuredResponse(prompt);
            const parsed = JSON.parse(response.replace(/```json|```/g, '').trim());
            return {
                refined_goal: parsed.refined_goal || rawGoal,
                short_name: parsed.short_name || rawGoal
            };
        } catch (error) {
            console.error('Failed to enhance blueprint goal:', error);
            // Fallback: Use raw goal and simple truncation for name
            return {
                refined_goal: rawGoal,
                short_name: rawGoal.split(' ').slice(0, 4).join(' ')
            };
        }
    }
}

export default new InputEnhancementService();
