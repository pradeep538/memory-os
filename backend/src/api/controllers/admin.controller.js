
import { query } from '../../db/index.js';

class AdminController {
    /**
     * Get all detected patterns with debug evidence
     * @route GET /api/v1/admin/patterns
     */
    async getPatternsDebug(request, reply) {
        try {
            const sql = `
                SELECT 
                    id, 
                    title, 
                    body, 
                    created_at, 
                    data->>'evidence' as evidence,
                    data->>'confidence' as confidence,
                    is_read,
                    data->>'reasoning' as reasoning
                FROM feed_items 
                WHERE type = 'pattern' OR type = 'insight'
                ORDER BY created_at DESC
                LIMIT 50
            `;
            const result = await query(sql);

            return reply.send({
                success: true,
                count: result.rows.length,
                data: result.rows.map(row => ({
                    ...row,
                    evidence: typeof row.evidence === 'string' ? JSON.parse(row.evidence) : row.evidence
                }))
            });
        } catch (error) {
            request.log.error(error);
            return reply.code(500).send({ success: false, error: 'Failed to fetch patterns' });
        }
    }

    /**
     * Trigger manual analysis for a user
     * @route POST /api/v1/admin/analyze
     */
    async triggerAnalysis(request, reply) {
        // Dynamic imports to avoid circular deps if any
        const analyticsService = (await import('../../services/analytics/analyticsService.js')).default;
        const feedService = (await import('../../services/engagement/feedService.js')).default;
        const llmService = (await import('../../services/understanding/llmService.js')).default;

        try {
            // Use first user from DB if not provided (for quick testing)
            let userId = request.body?.userId;

            if (!userId) {
                const userRes = await query('SELECT id FROM users LIMIT 1');
                if (userRes.rows.length === 0) return reply.code(404).send({ error: 'No users found' });
                userId = userRes.rows[0].id;
            }

            console.log(`🧠 Admin Force Trigger: Analyzing user ${userId}...`);

            // 1. Fetch Patterns
            const response = await analyticsService.getPatterns(userId);
            if (!response || !response.success || !response.data) {
                return reply.send({ success: false, message: 'No patterns returned from Analytics Service' });
            }

            const pData = response.data;
            const patternList = [...(pData.frequency_patterns || []), ...(pData.time_patterns || [])];

            // 2. Process ALL Patterns with Novelty Check (Admin Mode)
            const results = [];
            const historyContext = await feedService.getRecentInsights(userId, 5);
            const userTimezone = await feedService.getUserTimezone(userId);

            for (const pattern of patternList) {
                const noveltyResult = await llmService.evaluateNovelty(pattern, historyContext, userTimezone);

                const resultObj = {
                    pattern_id: pattern.id,
                    category: pattern.category,
                    novelty: noveltyResult,
                    action: 'skipped'
                };

                if (noveltyResult.isNovel) {
                    const insight = {
                        type: 'insight', // Use 'insight' for Amber Bulb 💡
                        title: `Insight: ${pattern.category.charAt(0).toUpperCase() + pattern.category.slice(1)}`,
                        body: noveltyResult.insightText || pattern.description,
                        data: {
                            pattern_id: pattern.id,
                            pattern_type: pattern.pattern_type || pattern.type,
                            category: pattern.category,
                            confidence: pattern.confidence,
                            evidence: pattern.evidence,
                            reasoning: noveltyResult.reasoning
                        }
                    };

                    const saved = await feedService.upsertPatternItem(userId, insight);
                    resultObj.saved_item = saved;
                    resultObj.action = 'upserted';
                }

                results.push(resultObj);
            }

            return reply.send({
                success: true,
                message: `Analyzed ${patternList.length} patterns.`,
                data: results
            });

        } catch (error) {
            request.log.error(error);
            return reply.code(500).send({ success: false, error: 'Analysis failed: ' + error.message });
        }
    }
}

export default new AdminController();
