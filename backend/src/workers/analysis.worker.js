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
            if (patternList.length > 0) {
                const topPattern = patternList[0];
                // Map Python's 'pattern_type' to 'type' if needed
                const pType = topPattern.type || topPattern.pattern_type || topPattern.category || 'General';

                const insight = {
                    type: 'pattern',
                    title: `Pattern Detected: ${pType}`,
                    body: topPattern.description || `Trend in ${topPattern.category}.`,
                    data: {
                        pattern_id: topPattern.id,
                        confidence: topPattern.confidence
                    }
                };

                // Check if already exists
                const exists = await feedService.checkPatternExists(userId, topPattern.id);
                if (exists) {
                    console.log(`   Stats: Feed item for pattern ${topPattern.id} already exists. Skipping.`);
                    continue;
                }

                await feedService.createItem(userId, insight);
                console.log(`📝 Created Feed Item: ${insight.title}`);
            }

        } catch (err) {
            console.error('❌ Analysis Worker Failed:', err);
        }
    }
}
