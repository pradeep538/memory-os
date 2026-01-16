import geminiService from '../ai/geminiService.js';

const QUERY_TYPES = {
    CHECK_TODAY: ['check_today', 'checktoday', 'todaycheck', 'did_today', 'today', 'did_i'],
    CHECK_YESTERDAY: ['check_yesterday', 'yesterday', 'did_yesterday'],
    LAST_OCCURRENCE: ['last_occurrence', 'lastoccurrence', 'last_time', 'when_last', 'whenlast', 'last'],
    FREQUENCY: ['frequency', 'how_often', 'howoften', 'often', 'how_many_times'],
    NEXT_DUE: ['next_due', 'nextdue', 'when_next', 'whennext', 'next_time'],
    COUNT_TOTAL: ['count', 'total', 'how_many', 'howmany', 'total_times']
};

export class QueryParser {
    /**
     * Parse voice query using LLM with minimal extraction
     */
    async parse(text) {
        const prompt = this.buildPrompt(text);
        // TODO: Implement actual LLM call when geminiService is ready
        const response = '{"query_type":"CHECK_TODAY","subject":"example","search_keywords":["example"],"answer_template":{"positive":"Yes","negative":"No"}}';
        const extracted = this.parseResponse(response);

        // Normalize query type to handle typos
        extracted.query_type = this.normalizeQueryType(extracted.query_type);

        return extracted;
    }

    buildPrompt(text) {
        return `
Parse this query and provide a simple, direct answer template:

Question: "${text}"

Extract:
1. query_type: Choose ONE from: CHECK_TODAY, CHECK_YESTERDAY, LAST_OCCURRENCE, FREQUENCY, NEXT_DUE, COUNT_TOTAL
2. subject: What they're asking about (extract the noun/activity)
3. search_keywords: Array of keyword variations for database search
4. answer_template: A simple sentence template with placeholders like {time}, {date}, {count}

EXAMPLES:

Input: "Did I take vitamin C today?"
Output:
{
  "query_type": "CHECK_TODAY",
  "subject": "vitamin C",
  "search_keywords": ["vitamin C", "vitamin-C", "vitC", "vit C", "ascorbic"],
  "answer_template": {
    "positive": "Yes, taken at {time}",
    "negative": "Not yet today"
  }
}

Input: "When did I last water the plants?"
Output:
{
  "query_type": "LAST_OCCURRENCE",
  "subject": "water plants",
  "search_keywords": ["water plants", "watered", "watering", "plant care"],
  "answer_template": {
    "positive": "{days_ago} days ago on {date}",
    "negative": "No record found"
  }
}

Input: "How often do I exercise?"
Output:
{
  "query_type": "FREQUENCY",
  "subject": "exercise",
  "search_keywords": ["exercise", "workout", "gym", "training"],
  "answer_template": {
    "positive": "About {frequency} times per week",
    "negative": "Not enough data"
  }
}

Now parse: "${text}"
Output JSON only:
`;
    }

    parseResponse(response) {
        try {
            // Extract JSON from response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in LLM response');
            }

            return JSON.parse(jsonMatch[0]);
        } catch (error) {
            console.error('Failed to parse LLM response:', error);
            throw new Error('Invalid LLM response format');
        }
    }

    /**
     * Normalize query type to handle typos and variations
     */
    normalizeQueryType(rawType) {
        const normalized = rawType.toLowerCase().replace(/[_\s-]/g, '');

        for (const [canonical, variants] of Object.entries(QUERY_TYPES)) {
            for (const variant of variants) {
                const variantNormalized = variant.toLowerCase().replace(/[_\s-]/g, '');
                if (normalized.includes(variantNormalized) || variantNormalized.includes(normalized)) {
                    return canonical;
                }
            }
        }

        // Fallback: return original if no match
        return rawType.toUpperCase().replace(/[_\s-]/g, '_');
    }

    /**
     * Execute query against database
     */
    async execute(userId, extracted, db) {
        const { query_type, search_keywords } = extracted;

        switch (query_type) {
            case 'CHECK_TODAY':
                return await this.checkToday(userId, search_keywords, db);

            case 'CHECK_YESTERDAY':
                return await this.checkYesterday(userId, search_keywords, db);

            case 'LAST_OCCURRENCE':
                return await this.findLastOccurrence(userId, search_keywords, db);

            case 'FREQUENCY':
                return await this.calculateFrequency(userId, search_keywords, db);

            case 'NEXT_DUE':
                return await this.predictNextDue(userId, search_keywords, db);

            case 'COUNT_TOTAL':
                return await this.countTotal(userId, search_keywords, db);

            default:
                throw new Error(`Unknown query type: ${query_type}`);
        }
    }

    async checkToday(userId, keywords, db) {
        const conditions = keywords.map(() => 'raw_input ILIKE ?').join(' OR ');
        const params = [userId, ...keywords.map(k => `%${k}%`)];

        const result = await db.query(`
      SELECT raw_input, created_at
      FROM memory_units
      WHERE user_id = ?
        AND (${conditions})
        AND DATE(created_at) = DATE('now')
      ORDER BY created_at DESC
      LIMIT 1
    `, params);

        if (result.length > 0) {
            return {
                found: true,
                data: {
                    time: this.formatTime(result[0].created_at),
                    full_text: result[0].raw_input,
                    timestamp: result[0].created_at
                }
            };
        }

        return { found: false };
    }

    async checkYesterday(userId, keywords, db) {
        const conditions = keywords.map(() => 'raw_input ILIKE ?').join(' OR ');
        const params = [userId, ...keywords.map(k => `%${k}%`)];

        const result = await db.query(`
      SELECT raw_input, created_at
      FROM memory_units
      WHERE user_id = ?
        AND (${conditions})
        AND DATE(created_at) = DATE('now', '-1 day')
      ORDER BY created_at DESC
      LIMIT 1
    `, params);

        return {
            found: result.length > 0,
            data: result.length > 0 ? {
                time: this.formatTime(result[0].created_at),
                full_text: result[0].raw_input
            } : null
        };
    }

    async findLastOccurrence(userId, keywords, db) {
        const conditions = keywords.map(() => 'raw_input ILIKE ?').join(' OR ');
        const params = [userId, ...keywords.map(k => `%${k}%`)];

        const result = await db.query(`
      SELECT raw_input, created_at
      FROM memory_units
      WHERE user_id = ?
        AND (${conditions})
      ORDER BY created_at DESC
      LIMIT 1
    `, params);

        if (result.length > 0) {
            const daysAgo = this.calculateDaysAgo(result[0].created_at);

            return {
                found: true,
                data: {
                    days_ago: daysAgo,
                    date: this.formatDate(result[0].created_at),
                    timestamp: result[0].created_at
                }
            };
        }

        return { found: false };
    }

    async calculateFrequency(userId, keywords, db) {
        const conditions = keywords.map(() => 'raw_input ILIKE ?').join(' OR ');
        const params = [userId, ...keywords.map(k => `%${k}%`)];

        const result = await db.query(`
      SELECT COUNT(*) as count
      FROM memory_units
      WHERE user_id = ?
        AND (${conditions})
        AND created_at >= datetime('now', '-30 days')
    `, params);

        if (result[0].count > 0) {
            const perWeek = (result[0].count / 30) * 7;

            return {
                found: true,
                data: {
                    frequency: Math.round(perWeek * 10) / 10,
                    count: result[0].count
                }
            };
        }

        return { found: false };
    }

    async predictNextDue(userId, keywords, db) {
        // Get last occurrence and average frequency
        const lastOccurrence = await this.findLastOccurrence(userId, keywords, db);
        const frequency = await this.calculateFrequency(userId, keywords, db);

        if (lastOccurrence.found && frequency.found) {
            const avgDaysBetween = 7 / frequency.data.frequency;
            const nextDueDate = new Date(lastOccurrence.data.timestamp);
            nextDueDate.setDate(nextDueDate.getDate() + avgDaysBetween);

            const daysUntil = this.calculateDaysAgo(nextDueDate);

            return {
                found: true,
                data: {
                    days_until: Math.abs(daysUntil),
                    date: this.formatDate(nextDueDate),
                    is_overdue: daysUntil < 0
                }
            };
        }

        return { found: false };
    }

    async countTotal(userId, keywords, db) {
        const conditions = keywords.map(() => 'raw_input ILIKE ?').join(' OR ');
        const params = [userId, ...keywords.map(k => `%${k}%`)];

        const result = await db.query(`
      SELECT COUNT(*) as count
      FROM memory_units
      WHERE user_id = ?
        AND (${conditions})
    `, params);

        return {
            found: result[0].count > 0,
            data: {
                count: result[0].count
            }
        };
    }

    /**
     * Fill answer template with actual data
     */
    fillTemplate(template, data, found) {
        const answerTemplate = found ? template.positive : template.negative;

        // Replace placeholders
        let answer = answerTemplate.replace(/\{(\w+)\}/g, (match, key) => {
            return data?.[key] !== undefined ? data[key] : match;
        });

        return answer;
    }

    // Utility functions
    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }

    formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    }

    calculateDaysAgo(timestamp) {
        const now = new Date();
        const then = new Date(timestamp);
        const diffMs = now - then;
        return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    }
}

export const queryParser = new QueryParser();
