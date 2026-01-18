import geminiService from '../ai/geminiService.js';

const QUERY_TYPES = {
    CHECK_TODAY: ['check_today', 'checktoday', 'todaycheck', 'did_today', 'today', 'did_i'],
    CHECK_YESTERDAY: ['check_yesterday', 'yesterday', 'did_yesterday'],
    FIND_LAST: ['find_last', 'last_occurrence', 'lastoccurrence', 'last_time', 'when_last', 'whenlast', 'last', 'FIND_LAST'],
    CALCULATE_FREQUENCY: ['calculate_frequency', 'frequency', 'how_often', 'howoften', 'often', 'how_many_times', 'CALCULATE_FREQUENCY'],
    COUNT_TOTAL: ['count_total', 'count', 'total', 'how_many', 'howmany', 'total_times', 'COUNT_TOTAL'],
    SUM_TOTAL: ['sum_total', 'sum', 'total_amount', 'how_much', 'total_cost', 'SUM_TOTAL']
};

export class QueryParser {
    /**
     * Parse voice query using LLM with minimal extraction
     */
    async parse(text) {
        const prompt = `Translate this user question into a structured query for a life-tracking database.
The database has a table "memory_units" with columns: id, user_id, raw_input, enhanced_text, category, event_type, normalized_data, and created_at.

QUERY TYPES:
1. CHECK_TODAY: Did I do X today?
2. CHECK_YESTERDAY: Did I do X yesterday?
3. FIND_LAST: When was the last time I did X?
4. CALCULATE_FREQUENCY: How often do I do X?
5. COUNT_TOTAL: How many times have I done X in total?
6. SUM_TOTAL: How much (money/distance/time) have I spent/done on X?

Return ONLY valid JSON in this format:
{
  "query_type": "CHECK_TODAY" | "CHECK_YESTERDAY" | "FIND_LAST" | "CALCULATE_FREQUENCY" | "COUNT_TOTAL" | "SUM_TOTAL",
  "subject": "the main activity (e.g., coffee, gym, medication)",
  "search_keywords": ["keyword1", "synonym1", "related_term"],
  "notes": "CRITICAL: Automatically include 3-5 synonyms/related terms for broad matching. Example: 'saloon' -> ['saloon', 'haircut', 'shaving', 'barber', 'parlour']",
  "answer_template": {
    "positive": "Natural language template for found. Use {raw_input} to show exact record, {date}, {time}, {days_ago}, {count}, {total}, or {formatted_total} where appropriate.",
    "negative": "Natural language template for not found"
  }
}

User Question: "${text}"`;

        try {
            const llmService = (await import('../understanding/llmService.js')).default;
            const textResponse = await llmService.generateStructuredResponse(prompt);

            // Extract JSON from response (handle markdown code blocks)
            let jsonText = textResponse.trim();
            if (jsonText.includes('```json')) {
                jsonText = jsonText.split('```json')[1].split('```')[0].trim();
            } else if (jsonText.includes('```')) {
                jsonText = jsonText.split('```')[1].split('```')[0].trim();
            }

            const response = JSON.parse(jsonText);

            // Normalize query type to handle typos
            response.query_type = this.normalizeQueryType(response.query_type);

            return response;
        } catch (err) {
            console.error('QueryParser parsing failed:', err);
            // Fallback to a safe default
            return {
                query_type: 'CHECK_TODAY',
                subject: text,
                search_keywords: [text],
                answer_template: { positive: "Found: {raw_input}", negative: "No matching records found." }
            };
        }
    }

    /**
     * Normalize query type to handle variations from LLM
     */
    normalizeQueryType(rawType) {
        if (!rawType) return 'CHECK_TODAY';
        const normalized = rawType.toUpperCase().replace(/[_\s-]/g, '_');

        if (normalized === 'LAST_OCCURRENCE') return 'FIND_LAST';
        if (normalized === 'FREQUENCY') return 'CALCULATE_FREQUENCY';

        // Return original if it looks valid, otherwise default
        return normalized;
    }

    /**
     * Execute structured query against database
     */
    async execute(userId, extracted, db, excludeId = null) {
        switch (extracted.query_type) {
            case 'CHECK_TODAY':
                return this.checkToday(userId, extracted, db, excludeId);
            case 'CHECK_YESTERDAY':
                return this.checkYesterday(userId, extracted, db, excludeId);
            case 'FIND_LAST':
                return this.findLastOccurrence(userId, extracted, db, excludeId);
            case 'CALCULATE_FREQUENCY':
                return this.calculateFrequency(userId, extracted, db, excludeId);
            case 'COUNT_TOTAL':
                return this.countTotal(userId, extracted, db, excludeId);
            case 'SUM_TOTAL':
                return this.sumTotal(userId, extracted, db, excludeId);
            default:
                return this.findLastOccurrence(userId, extracted, db, excludeId);
        }
    }

    async checkToday(userId, extracted, db, excludeId) {
        const keywords = extracted.search_keywords || [extracted.subject];
        const conditions = keywords.map((_, i) => `raw_input ILIKE $${i + 2}`).join(' OR ');
        const params = [userId, ...keywords.map(k => `%${k}%`)];

        let query = `
            SELECT * FROM memory_units 
            WHERE user_id = $1 
            AND created_at >= CURRENT_DATE 
            AND (${conditions})
        `;

        if (excludeId) {
            query += ` AND id != $${params.length + 1}`;
            params.push(excludeId);
        }

        query += ` ORDER BY created_at DESC LIMIT 1`;

        const result = await db(query, params);

        return {
            found: result.rows.length > 0,
            data: result.rows[0] ? {
                ...result.rows[0],
                time: this.formatTime(result.rows[0].created_at)
            } : {}
        };
    }

    async checkYesterday(userId, extracted, db, excludeId) {
        const keywords = extracted.search_keywords || [extracted.subject];
        const conditions = keywords.map((_, i) => `raw_input ILIKE $${i + 2}`).join(' OR ');
        const params = [userId, ...keywords.map(k => `%${k}%`)];

        let query = `
            SELECT * FROM memory_units 
            WHERE user_id = $1 
            AND created_at >= CURRENT_DATE - INTERVAL '1 day' 
            AND created_at < CURRENT_DATE
            AND (${conditions})
        `;

        if (excludeId) {
            query += ` AND id != $${params.length + 1}`;
            params.push(excludeId);
        }

        query += ` ORDER BY created_at DESC LIMIT 1`;

        const result = await db(query, params);

        return {
            found: result.rows.length > 0,
            data: result.rows[0] ? {
                ...result.rows[0],
                time: this.formatTime(result.rows[0].created_at)
            } : {}
        };
    }

    async findLastOccurrence(userId, extracted, db, excludeId) {
        const keywords = extracted.search_keywords || [extracted.subject];
        const conditions = keywords.map((_, i) => `raw_input ILIKE $${i + 2}`).join(' OR ');
        const params = [userId, ...keywords.map(k => `%${k}%`)];

        let query = `
            SELECT * FROM memory_units 
            WHERE user_id = $1 
            AND (${conditions})
        `;

        if (excludeId) {
            query += ` AND id != $${params.length + 1}`;
            params.push(excludeId);
        }

        query += ` ORDER BY created_at DESC LIMIT 1`;

        const result = await db(query, params);

        if (result.rows.length > 0) {
            const row = result.rows[0];
            // Semantic Date Logic
            const semanticDate = row.normalized_data?.event_date ? new Date(row.normalized_data.event_date) : new Date(row.created_at);
            return {
                found: true,
                data: {
                    ...row,
                    date: this.formatDate(semanticDate),
                    time: this.formatTime(row.created_at),
                    days_ago: this.calculateDaysAgo(semanticDate)
                }
            };
        }

        return { found: false };
    }

    async calculateFrequency(userId, extracted, db) {
        const keywords = extracted.search_keywords || [extracted.subject];
        const conditions = keywords.map((_, i) => `raw_input ILIKE $${i + 2}`).join(' OR ');
        const params = [userId, ...keywords.map(k => `%${k}%`)];

        const result = await db(`
            SELECT COUNT(*) as count 
            FROM memory_units 
            WHERE user_id = $1 
            AND created_at >= CURRENT_DATE - INTERVAL '30 days'
            AND (${conditions})
        `, params);

        if (result.rows.length > 0) {
            const count = parseInt(result.rows[0].count);
            const perWeek = (count / 30) * 7;

            return {
                found: count > 0,
                data: {
                    frequency: Math.round(perWeek * 10) / 10,
                    count: count
                }
            };
        }

        return { found: false };
    }

    async countTotal(userId, extracted, db) {
        const keywords = extracted.search_keywords || [extracted.subject];
        const conditions = keywords.map((_, i) => `raw_input ILIKE $${i + 2}`).join(' OR ');
        const params = [userId, ...keywords.map(k => `%${k}%`)];

        const result = await db(`
            SELECT COUNT(*) as count 
            FROM memory_units 
            WHERE user_id = $1 
            AND (${conditions})
        `, params);

        const count = result.rows.length > 0 ? parseInt(result.rows[0].count) : 0;
        return {
            found: count > 0,
            data: {
                count: count
            }
        };
    }

    async sumTotal(userId, extracted, db, excludeId) {
        const keywords = extracted.search_keywords || [extracted.subject];
        // Add explicit type cast to parameters for ILIKE
        const conditions = keywords.map((_, i) => `raw_input ILIKE $${i + 2}::text`).join(' OR ');
        const params = [userId, ...keywords.map(k => `%${k}%`)];

        // Try to sum common numeric fields in the normalized_data JSONB column
        // We look for 'amount', 'cost', 'price', 'value', 'distance', 'duration'
        // This handles cases like {"amount": "$15"} by extracting numeric characters
        let query = `
            SELECT 
                SUM(
                    COALESCE(
                        NULLIF(regexp_replace((normalized_data->>'amount')::text, '[^0-9.]', '', 'g'), '')::numeric,
                        NULLIF(regexp_replace((normalized_data->>'cost')::text, '[^0-9.]', '', 'g'), '')::numeric,
                        NULLIF(regexp_replace((normalized_data->>'price')::text, '[^0-9.]', '', 'g'), '')::numeric,
                        NULLIF(regexp_replace((normalized_data->>'value')::text, '[^0-9.]', '', 'g'), '')::numeric,
                        NULLIF(regexp_replace((normalized_data->>'distance')::text, '[^0-9.]', '', 'g'), '')::numeric,
                        0
                    )
                ) as total
            FROM memory_units 
            WHERE user_id = $1::uuid 
            AND (${conditions})
        `;

        if (excludeId) {
            query += ` AND id != $${params.length + 1}::uuid`;
            params.push(excludeId);
        }

        const result = await db(query, params);
        const total = result.rows[0]?.total ? parseFloat(result.rows[0].total) : 0;

        // Detect Unit from the latest record
        let unitPrefix = '';
        let unitSuffix = '';

        if (total > 0) {
            // Re-construct params for sample query to avoid index issues of reused array
            const sampleParams = [userId, ...keywords.map(k => `%${k}%`)];

            let sampleQuery = `
                SELECT normalized_data FROM memory_units 
                WHERE user_id = $1::uuid AND (${conditions})
            `;

            if (excludeId) {
                sampleQuery += ` AND id != $${sampleParams.length + 1}::uuid`;
                sampleParams.push(excludeId);
            }

            sampleQuery += ` ORDER BY created_at DESC LIMIT 1`;

            const sampleResult = await db(sampleQuery, sampleParams);
            if (sampleResult.rows.length > 0) {
                const data = sampleResult.rows[0].normalized_data;
                const keys = ['amount', 'cost', 'price', 'value', 'distance', 'duration'];
                for (const key of keys) {
                    if (data[key]) {
                        const val = data[key].toString();
                        // Check for prefix (e.g. $)
                        const prefixMatch = val.match(/^[^0-9]+/);
                        if (prefixMatch) unitPrefix = prefixMatch[0].trim();

                        // Check for suffix (e.g. km, mins)
                        const suffixMatch = val.match(/[^0-9]+$/);
                        if (suffixMatch) unitSuffix = suffixMatch[0].trim();
                        break;
                    }
                }
            }
        }

        const formattedTotal = `${unitPrefix}${total}${unitSuffix ? ' ' + unitSuffix : ''}`.trim();

        return {
            found: total > 0,
            data: {
                total: total,
                formatted_total: formattedTotal,
                unit: unitPrefix || unitSuffix
            }
        };
    }

    /**
     * Fill answer template with actual data
     */
    fillTemplate(template, data, found) {
        if (!template) return "No template provided";
        const answerTemplate = found ? (template.positive || "Found") : (template.negative || "Not found");

        // 1. Create aliases for robustness
        const safeData = { ...data };
        if (safeData.count !== undefined && safeData.total === undefined) safeData.total = safeData.count;
        if (safeData.total !== undefined && safeData.count === undefined) safeData.count = safeData.total;
        if (safeData.total !== undefined && safeData.amount === undefined) safeData.amount = safeData.total;

        // 2. Replace placeholders (e.g., {date}, {time}, {count}, {raw_input}, {total})
        let answer = answerTemplate.replace(/\{(\w+)\}/g, (match, key) => {
            return safeData?.[key] !== undefined ? safeData[key] : match;
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
