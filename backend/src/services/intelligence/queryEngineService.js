import llmService from '../understanding/llmService.js';
import db from '../../db/index.js';

/**
 * Query Engine Service
 * 
 * Strategy 2: LLM extracts intent → Safe query builder constructs SQL
 * 
 * Supports 6 intent types:
 * 1. aggregate - Sum/average/count (e.g., "How much did I spend on food?")
 * 2. count - Count occurrences (e.g., "How many workouts this month?")
 * 3. find_last - Most recent (e.g., "When did I last meditate?")
 * 4. list - List items (e.g., "Show my recent expenses")
 * 5. timeline - Group by time (e.g., "My workouts per week")
 * 6. compare - Compare categories (e.g., "Food vs transport spending")
 */
class QueryEngineService {
    /**
     * Process natural language query
     */
    async query(userId, question) {
        try {
            // 1. Extract intent using LLM
            const intent = await this.extractIntent(question);

            if (!intent.success) {
                return {
                    success: false,
                    error: 'Could not understand query',
                    suggestion: 'Try asking: How much did I spend on food this month?'
                };
            }

            // 2. Build safe SQL query
            const sqlQuery = this.buildSafeQuery(userId, intent);

            if (!sqlQuery) {
                return {
                    success: false,
                    error: 'Could not build query for this intent'
                };
            }

            // 3. Execute query
            const result = await db.query(sqlQuery.sql, sqlQuery.params);

            // 4. Format result
            const formatted = this.formatResult(intent, result.rows);

            return {
                success: true,
                question,
                intent: intent.type,
                answer: formatted.answer,
                data: formatted.data,
                sql: sqlQuery.sql // For debugging (remove in production)
            };

        } catch (error) {
            console.error('Query engine error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Extract intent from natural language question using Gemini
     */
    async extractIntent(question) {
        const prompt = `
You are a query intent classifier. Extract structured intent from natural language questions about personal data.

Question: "${question}"

Return ONLY a JSON object with this structure:
{
  "type": "aggregate" | "count" | "find_last" | "list" | "timeline" | "compare",
  "category": "fitness" | "finance" | "routine" | "mindfulness" | "health" | "generic" | "all",
  "timeRange": "today" | "week" | "month" | "year" | "all" | null,
  "metric": string (what to measure, e.g., "amount", "duration", "count"),
  "filter": string | null (e.g., "food", "chest workout"),
  "limit": number | null (for list queries)
}

Examples:

Q: "How much did I spend on food this month?"
A: {"type": "aggregate", "category": "finance", "timeRange": "month", "metric": "amount", "filter": "food", "limit": null}

Q: "How many workouts this week?"
A: {"type": "count", "category": "fitness", "timeRange": "week", "metric": "count", "filter": null, "limit": null}

Q: "When did I last meditate?"
A: {"type": "find_last", "category": "mindfulness", "timeRange": null, "metric": "date", "filter": "meditate", "limit": 1}

Q: "Show my recent expenses"
A: {"type": "list", "category": "finance", "timeRange": "month", "metric": "all", "filter": null, "limit": 10}

Q: "My workouts per week for the last month"
A: {"type": "timeline", "category": "fitness", "timeRange": "month", "metric": "count", "filter": null, "limit": null}

Now extract intent from the question. Return ONLY the JSON.
`;

        try {
            const result = await llmService.model.generateContent(prompt);
            const text = result.response.text().trim();

            // Extract JSON
            let jsonText = text;
            if (jsonText.startsWith('```json')) {
                jsonText = jsonText.slice(7, -3).trim();
            } else if (jsonText.startsWith('```')) {
                jsonText = jsonText.slice(3, -3).trim();
            }

            const intent = JSON.parse(jsonText);
            return { success: true, ...intent };
        } catch (error) {
            console.error('Intent extraction failed:', error);
            return { success: false };
        }
    }

    /**
     * Build safe parameterized SQL query
     */
    buildSafeQuery(userId, intent) {
        const { type, category, timeRange, metric, filter, limit } = intent;

        // Base query parts
        let select = 'SELECT';
        let from = 'FROM memory_units';
        let where = ['user_id = $1', 'status = \'validated\''];
        let params = [userId];
        let paramIndex = 2;

        // Add category filter
        if (category && category !== 'all') {
            where.push(`category = $${paramIndex}`);
            params.push(category);
            paramIndex++;
        }

        // Add time range filter
        if (timeRange) {
            const timeFilter = this.getTimeRangeFilter(timeRange, paramIndex);
            where.push(timeFilter.condition);
            paramIndex = timeFilter.paramIndex;
        }

        // Add custom filter (e.g., specific activity or item)
        if (filter) {
            where.push(`(
        normalized_data->>'activity' ILIKE $${paramIndex} OR
        normalized_data->>'item' ILIKE $${paramIndex} OR
        normalized_data->>'subcategory' ILIKE $${paramIndex}
      )`);
            params.push(`%${filter}%`);
            paramIndex++;
        }

        // Build query based on intent type
        let orderBy = '';
        let groupBy = '';

        switch (type) {
            case 'aggregate':
                if (metric === 'amount') {
                    select += ' SUM(ABS((normalized_data->>\'amount\')::numeric)) as total';
                } else if (metric === 'duration') {
                    select += ' SUM((normalized_data->>\'duration_minutes\')::numeric) as total';
                } else {
                    select += ' COUNT(*) as total';
                }
                break;

            case 'count':
                select += ' COUNT(*) as count';
                break;

            case 'find_last':
                select += ' *';
                orderBy = 'ORDER BY created_at DESC';
                break;

            case 'list':
                select += ' id, raw_input, category, created_at, normalized_data';
                orderBy = 'ORDER BY created_at DESC';
                if (limit) {
                    orderBy += ` LIMIT ${parseInt(limit)}`;
                }
                break;

            case 'timeline':
                select += ' DATE_TRUNC(\'week\', created_at) as week, COUNT(*) as count';
                groupBy = 'GROUP BY week';
                orderBy = 'ORDER BY week DESC';
                break;

            case 'compare':
                select += ' normalized_data->>\'subcategory\' as category, SUM(ABS((normalized_data->>\'amount\')::numeric)) as total';
                groupBy = 'GROUP BY category';
                orderBy = 'ORDER BY total DESC';
                break;

            default:
                return null;
        }

        // Construct full SQL
        const sql = `
      ${select}
      ${from}
      WHERE ${where.join(' AND ')}
      ${groupBy}
      ${orderBy}
    `.trim();

        return { sql, params };
    }

    /**
     * Get time range SQL filter
     */
    getTimeRangeFilter(range, paramIndex) {
        const filters = {
            'today': 'created_at >= CURRENT_DATE',
            'week': 'created_at >= DATE_TRUNC(\'week\', NOW())',
            'month': 'created_at >= DATE_TRUNC(\'month\', NOW())',
            'year': 'created_at >= DATE_TRUNC(\'year\', NOW())'
        };

        return {
            condition: filters[range] || '1=1',
            paramIndex
        };
    }

    /**
     * Format query result
     */
    formatResult(intent, rows) {
        if (rows.length === 0) {
            return {
                answer: 'No data found for this query.',
                data: []
            };
        }

        const { type, category, metric } = intent;

        switch (type) {
            case 'aggregate':
                const total = rows[0].total || 0;
                if (metric === 'amount') {
                    return {
                        answer: `Total: ₹${parseFloat(total).toLocaleString('en-IN')}`,
                        data: { total: parseFloat(total) }
                    };
                }
                return {
                    answer: `Total: ${total}`,
                    data: { total: parseFloat(total) }
                };

            case 'count':
                const count = rows[0].count || 0;
                return {
                    answer: `Count: ${count}`,
                    data: { count: parseInt(count) }
                };

            case 'find_last':
                const last = rows[0];
                return {
                    answer: `Last recorded: ${new Date(last.created_at).toLocaleString('en-IN')} - "${last.raw_input}"`,
                    data: last
                };

            case 'list':
                return {
                    answer: `Found ${rows.length} items`,
                    data: rows.map(r => ({
                        id: r.id,
                        text: r.raw_input,
                        category: r.category,
                        date: r.created_at
                    }))
                };

            case 'timeline':
                return {
                    answer: `${rows.length} weeks of data`,
                    data: rows.map(r => ({
                        week: r.week,
                        count: parseInt(r.count)
                    }))
                };

            case 'compare':
                return {
                    answer: `Top: ${rows[0].category} (₹${parseFloat(rows[0].total).toLocaleString('en-IN')})`,
                    data: rows.map(r => ({
                        category: r.category,
                        total: parseFloat(r.total)
                    }))
                };

            default:
                return {
                    answer: 'Result found',
                    data: rows
                };
        }
    }
}

export default new QueryEngineService();
