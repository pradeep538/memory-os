
import feedbackService from '../services/engagement/feedbackService.js';
import queue from '../lib/queue.js';

export const QUEUE_NAME = 'memory.created';

export default async function (jobOrJobs) {
    const jobs = Array.isArray(jobOrJobs) ? jobOrJobs : [jobOrJobs];

    for (const job of jobs) {
        const { userId, memoryId } = job.data || {};

        if (!userId) {
            console.error(`❌ Job ${job.id} missing userId. Data:`, job.data);
            continue;
        }

        console.log(`⚡ Processing memory.created for user ${userId} (Job ${job.id})`);

        try {
            // 1. Generate Immediate Feedback
            // (Streak is auto-updated by DB trigger on memory insert)
            await feedbackService.generateImmediateLogic(userId, memoryId);

            // 2. Schedule Delayed Analysis (The "Thinking" Phase)
            // Delay 2 hours to create curiosity loop
            await queue.send('memory.analysis', { userId, memoryId }, { startAfter: 7200 }); // 7200 seconds = 2 hours
            console.log(`🕒 Scheduled memory.analysis for user ${userId} in 2 hours`);

        } catch (err) {
            console.error('❌ Engagement Worker Failed:', err);
            throw err; // Retry
        }
    }
}
