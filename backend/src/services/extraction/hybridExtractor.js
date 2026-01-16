import { query as db } from '../../db/index.js';

/**
 * Hybrid Extractor Service
 * Deterministic path for critical data, LLM fallback for general
 */
export class HybridExtractor {
    constructor() {
        this.deterministicExtractors = this.buildDeterministicExtractors();
    }

    /**
     * Main extraction method
     */
    async extract(input) {
        // 1. Try deterministic extractors first (critical data)
        const deterministicResult = await this.tryDeterministic(input);

        if (deterministicResult.matched) {
            return {
                intent: deterministicResult.intent,
                signals: deterministicResult.signals,
                confidence: 1.0, // Deterministic = always 1.0
                method: 'deterministic'
            };
        }

        // 2. Fall back to LLM (TODO: implement LLM extraction)
        // For now, return generic log
        return {
            intent: 'GENERAL_LOG',
            signals: {},
            confidence: 0.5,
            method: 'llm_placeholder'
        };
    }

    /**
     * Try deterministic extractors (regex-based)
     */
    async tryDeterministic(input) {
        const lowerInput = input.toLowerCase();

        // Check each extractor in priority order
        for (const extractor of this.deterministicExtractors) {
            const result = extractor.test(input, lowerInput);
            if (result) {
                return {
                    matched: true,
                    intent: result.intent,
                    signals: result.signals
                };
            }
        }

        return { matched: false };
    }

    /**
     * Build deterministic extractors (regex patterns)
     */
    buildDeterministicExtractors() {
        return [
            // 1. Medication extractor
            {
                test: (input, lowerInput) => {
                    // Pattern 1: "took/had/consumed [medication]"
                    const pattern1 = /\b(took|had|consumed|taken)\s+(?:my\s+)?([a-zA-Z0-9\s\-]+?)(?:\s+(?:pill|tablet|dose|medication|supplement))?(?:\s|$|\.)/i;
                    let match = input.match(pattern1);

                    if (match) {
                        const medication = match[2].trim();
                        // Filter out common false positives
                        if (medication.length < 2 || this.isCommonVerb(medication)) {
                            return null;
                        }

                        return {
                            intent: 'TRACK_MEDICATION',
                            signals: {
                                medication,
                                action: 'consumed',
                                timestamp: new Date().toISOString()
                            }
                        };
                    }

                    // Pattern 2: "[medication] pill/tablet/dose"
                    const pattern2 = /\b([a-zA-Z0-9\s\-]+?)\s+(pill|tablet|dose|medication|supplement)/i;
                    match = input.match(pattern2);

                    if (match) {
                        const medication = match[1].trim();
                        if (medication.length >= 2 && !this.isCommonVerb(medication)) {
                            return {
                                intent: 'TRACK_MEDICATION',
                                signals: {
                                    medication,
                                    action: 'consumed',
                                    timestamp: new Date().toISOString()
                                }
                            };
                        }
                    }

                    return null;
                }
            },

            // 2. Finance extractor
            {
                test: (input, lowerInput) => {
                    // Pattern: $XX or XX dollars/bucks + description
                    const pattern = /\$?(\d+\.?\d*)\s*(?:dollars?|bucks?|usd)?\s+(?:on|for|to|towards?)\s+(.+)|(?:spent|paid|bought)\s+\$?(\d+\.?\d*)\s+(?:on|for)?\s*(.+)/i;
                    const match = input.match(pattern);

                    if (match) {
                        const amount = parseFloat(match[1] || match[3]);
                        const description = (match[2] || match[4]).trim();

                        if (amount > 0 && amount < 1000000 && description.length > 1) {
                            return {
                                intent: 'TRACK_EXPENSE',
                                signals: {
                                    amount: Math.round(amount * 100) / 100,
                                    description,
                                    timestamp: new Date().toISOString()
                                }
                            };
                        }
                    }

                    return null;
                }
            },

            // 3. Exercise/Activity extractor
            {
                test: (input, lowerInput) => {
                    // Common exercise patterns
                    const exerciseKeywords = ['ran', 'jogged', 'walked', 'cycled', 'swam', 'lifted', 'exercised', 'workout', 'gym'];
                    const hasExercise = exerciseKeywords.some(kw => lowerInput.includes(kw));

                    if (!hasExercise) return null;

                    // Extract duration
                    const durationPattern = /(\d+)\s*(minutes?|mins?|m|hours?|hrs?|h)/i;
                    const durationMatch = input.match(durationPattern);
                    let duration = null;

                    if (durationMatch) {
                        duration = parseInt(durationMatch[1]);
                        if (durationMatch[2].toLowerCase().startsWith('h')) {
                            duration *= 60; // Convert hours to minutes
                        }
                    }

                    // Extract activity
                    let activity = null;
                    for (const kw of exerciseKeywords) {
                        if (lowerInput.includes(kw)) {
                            activity = kw;
                            break;
                        }
                    }

                    if (activity) {
                        const signals = { activity };
                        if (duration) signals.duration = duration;

                        return {
                            intent: 'BUILD_HABIT',
                            signals
                        };
                    }

                    return null;
                }
            }
        ];
    }

    /**
     * Check if word is a common verb (avoid false positives)
     */
    isCommonVerb(word) {
        const commonVerbs = ['a', 'an', 'the', 'some', 'my', 'it', 'this', 'that'];
        return commonVerbs.includes(word.toLowerCase());
    }

    /**
     * Load extractors from database (for dynamic patterns)
     */
    async loadExtractorsFromDB() {
        const signals = await db.query(`
      SELECT signal_key, extractors
      FROM signal_definitions
      WHERE extractors IS NOT NULL
    `);

        // TODO: Build regex extractors from database
        return signals;
    }
}

export const hybridExtractor = new HybridExtractor();
