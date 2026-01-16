import { query as db } from '../../db/index.js';

/**
 * Clarification Service
 * Handles ambiguous inputs that need user clarification
 */
export class ClarificationService {
    /**
     * Check if input needs clarification
     */
    async needsClarification(extractionResult) {
        // Confidence threshold for clarification
        const CLARIFICATION_THRESHOLD = 0.7;

        if (extractionResult.confidence >= CLARIFICATION_THRESHOLD) {
            return { needsClarification: false };
        }

        // Get candidate intents
        const candidates = await this.getCandidateIntents(extractionResult);

        if (candidates.length <= 1) {
            return { needsClarification: false };
        }

        return {
            needsClarification: true,
            question: this.generateQuestion(candidates),
            options: candidates,
            sessionId: this.generateSessionId()
        };
    }

    /**
     * Get candidate intents for ambiguous input
     */
    async getCandidateIntents(extractionResult) {
        const input = extractionResult.input.toLowerCase();
        const candidates = [];

        // Check common ambiguous words
        const ambiguousPatterns = {
            'apple': [
                { intent: 'LOG_FOOD', label: 'Ate an apple', signals: { food: 'apple' } },
                { intent: 'TRACK_EXPENSE', label: 'Bought an Apple product', signals: { category: 'electronics' } },
                { intent: 'TRACK_INVESTMENT', label: 'Bought Apple stock', signals: { ticker: 'AAPL' } }
            ],
            'orange': [
                { intent: 'LOG_FOOD', label: 'Ate an orange', signals: { food: 'orange' } },
                { intent: 'TRACK_EXPENSE', label: 'Spent money on orange item', signals: {} }
            ],
            'run': [
                { intent: 'BUILD_HABIT', label: 'Went for a run (exercise)', signals: { activity: 'running' } },
                { intent: 'TRACK_ROUTINE', label: 'Did a task/errand', signals: { activity: 'errand' } }
            ]
        };

        // Check if input contains ambiguous word
        for (const [word, options] of Object.entries(ambiguousPatterns)) {
            if (input.includes(word)) {
                candidates.push(...options);
                break;
            }
        }

        // If no predefined patterns, generate candidates from context
        if (candidates.length === 0) {
            candidates.push(...await this.generateCandidatesFromContext(input));
        }

        return candidates.map((c, idx) => ({
            id: idx + 1,
            ...c
        }));
    }

    /**
     * Generate candidates from user's historical context
     */
    async generateCandidatesFromContext(input) {
        // Get user's most common intents
        const commonIntents = await db.query(`
      SELECT 
        intent,
        COUNT(*) as frequency
      FROM memory_units
      WHERE user_id = ?
        AND intent IS NOT NULL
      GROUP BY intent
      ORDER BY frequency DESC
      LIMIT 3
    `);

        // Return generic candidates based on common intents
        return commonIntents.map(row => ({
            intent: row.intent,
            label: this.getIntentLabel(row.intent),
            signals: {}
        }));
    }

    /**
     * Generate clarification question
     */
    generateQuestion(candidates) {
        if (candidates.length === 2) {
            return `Did you ${candidates[0].label.toLowerCase()} or ${candidates[1].label.toLowerCase()}?`;
        }

        return 'I need clarification. Did you:';
    }

    /**
     * Store clarification session
     */
    async storeClarificationSession(userId, sessionId, input, candidates) {
        await db.query(`
      INSERT INTO clarification_sessions (
        id, user_id, original_input, candidates,
        created_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
            sessionId,
            userId,
            input,
            JSON.stringify(candidates),
            new Date(),
            new Date(Date.now() + 5 * 60 * 1000) // 5 minute expiry
        ]);
    }

    /**
     * Process user's clarification response
     */
    async processClarificationResponse(userId, sessionId, selectedOption) {
        // Get session
        const session = await db.query(`
      SELECT * FROM clarification_sessions
      WHERE id = ? AND user_id = ?
        AND expires_at > NOW()
    `, [sessionId, userId]);

        if (session.length === 0) {
            throw new Error('Clarification session expired or not found');
        }

        const candidates = JSON.parse(session[0].candidates);
        const selected = candidates.find(c => c.id === parseInt(selectedOption));

        if (!selected) {
            throw new Error('Invalid option selected');
        }

        // Learn from this clarification for future
        await this.learnFromClarification(userId, session[0].original_input, selected);

        // Delete session
        await db.query('DELETE FROM clarification_sessions WHERE id = ?', [sessionId]);

        return {
            intent: selected.intent,
            signals: selected.signals,
            input: session[0].original_input
        };
    }

    /**
     * Learn from clarification to reduce future ambiguity
     */
    async learnFromClarification(userId, input, selectedIntent) {
        // Store user preference pattern
        await db.query(`
      INSERT INTO user_intent_patterns (
        user_id, input_pattern, preferred_intent, learned_at
      ) VALUES (?, ?, ?, ?)
      ON CONFLICT (user_id, input_pattern) DO UPDATE SET
        preferred_intent = EXCLUDED.preferred_intent,
        learned_at = EXCLUDED.learned_at,
        frequency = user_intent_patterns.frequency + 1
    `, [userId, input.toLowerCase(), selectedIntent.intent, new Date()]);
    }

    /**
     * Check learned patterns before clarification
     */
    async checkLearnedPattern(userId, input) {
        const pattern = await db.query(`
      SELECT preferred_intent, frequency
      FROM user_intent_patterns
      WHERE user_id = ? AND input_pattern = ?
        AND frequency >= 3  -- Only trust if learned 3+ times
    `, [userId, input.toLowerCase()]);

        if (pattern.length > 0) {
            return {
                hasPattern: true,
                intent: pattern[0].preferred_intent
            };
        }

        return { hasPattern: false };
    }

    /**
     * Get human-readable label for intent
     */
    getIntentLabel(intent) {
        const labels = {
            'TRACK_MEDICATION': 'Log medication',
            'TRACK_EXPENSE': 'Record expense',
            'BUILD_HABIT': 'Log activity/habit',
            'LEARN_SKILL': 'Track learning session',
            'LOG_FOOD': 'Log food/meal',
            'TRACK_INVESTMENT': 'Record investment',
            'GENERAL_LOG': 'General note'
        };

        return labels[intent] || intent;
    }

    /**
     * Generate unique session ID
     */
    generateSessionId() {
        return `clarify_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }
}

export const clarificationService = new ClarificationService();
