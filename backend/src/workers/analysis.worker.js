import feedService from '../services/engagement/feedService.js';
import analyticsService from '../services/analytics/analyticsService.js';

export const QUEUE_NAME = 'memory.analysis';

export default async function (jobOrJobs) {
    const jobs = Array.isArray(jobOrJobs) ? jobOrJobs : [jobOrJobs];

    for (const job of jobs) {
        const { userId, memoryId } = job.data || {};
        console.log(`🧠 Analyzing memory ${memoryId} for user ${userId} (Job ${job.id})`);

        if (!userId) {
            console.warn(`Job ${job.id} missing userId`);
            continue;
        }

        try {
            // 1. Call Python Analytics Service
            console.log('   Stats: Fetching patterns from Python service...');
            const response = await analyticsService.getPatterns(userId);

            if (!response || !response.success || !response.data) {
                console.log('   Stats: No patterns returned or invalid response.');
                continue;
            }

            // Consolidate patterns (Frequency + Time)
            const pData = response.data;
            const patternList = [...(pData.frequency_patterns || []), ...(pData.time_patterns || [])];

            console.log(`   Stats: Found ${patternList.length} patterns.`);

            // 2. Generate Feed Items
            // 2. Smart Insight Generation (Novelty Check)

            // A. Get Context (Last 5 things we told them)
            const historyContext = await feedService.getRecentInsights(userId, 5);
            const userTimezone = await feedService.getUserTimezone(userId);

            const topPattern = patternList[0];

            // B. Ask LLM: "Is this news?"
            // Dynamic import to avoid circular dependency issues if any, though llmService is clean
            const llmService = (await import('../services/understanding/llmService.js')).default;

            console.log(`   🧠 Checking Novelty for: ${topPattern.description} (TZ: ${userTimezone})`);
            const noveltyResult = await llmService.evaluateNovelty(topPattern, historyContext, userTimezone);

            console.log(`   🤖 LLM Verdict: ${noveltyResult.isNovel ? '✅ NOVEL' : '❌ REPEAT'} (${noveltyResult.reasoning})`);

            if (noveltyResult.isNovel) {
                const insight = {
                    type: 'insight', // Use 'insight' for Amber Bulb 💡
                    title: `Insight: ${topPattern.category.charAt(0).toUpperCase() + topPattern.category.slice(1)}`,
                    body: noveltyResult.insightText || topPattern.description,
                    data: {
                        pattern_id: topPattern.id,
                        pattern_type: topPattern.pattern_type || topPattern.type,
                        category: topPattern.category,
                        confidence: topPattern.confidence,
                        evidence: topPattern.evidence,
                        reasoning: noveltyResult.reasoning
                    }
                };

                // Upsert (This will reset the 'updated_at' and bring it to top)
                await feedService.upsertPatternItem(userId, insight);
                console.log(`   💡 Published Insight: ${insight.body}`);
            } else {
                console.log(`   zzz Skipped (Not Novel).`);
            }

        } catch (err) {
            console.error('❌ Analysis Worker Failed:', err);
        }
    }
}
