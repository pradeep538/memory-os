
import queue from './lib/queue.js';
import { fileURLToPath } from 'url';

// Worker Modules Registration
// Import your new workers here and add to 'workers' array
// ----------------------------------------------------
import * as memoryWorker from './workers/memory.worker.js';
import * as engagementWorker from './workers/engagement.worker.js';
import * as analysisWorker from './workers/analysis.worker.js';

import * as dailySummaryWorker from './workers/daily_summary.worker.js';
import * as voiceResurfaceWorker from './workers/voice_resurface.worker.js';
import * as notificationWorker from './workers/notification.worker.js';

const workers = [
    memoryWorker,
    engagementWorker,
    analysisWorker,
    dailySummaryWorker,
    voiceResurfaceWorker,
    notificationWorker
];
// ----------------------------------------------------

console.log('🚀 Memory OS Background Worker Manager Started');

export async function startWorker() {
    try {
        await queue.start();

        // Register all workers
        for (const w of workers) {
            if (!w.QUEUE_NAME || !w.default) {
                console.warn(`⚠️ Invalid worker module: skipping. Export QUEUE_NAME and default function.`);
                continue;
            }

            // Ensure Queue Exists (prevents "Queue does not exist" error)
            await queue.createQueue(w.QUEUE_NAME);

            // Schedule if defined
            if (w.SCHEDULE) {
                await queue.schedule(w.QUEUE_NAME, w.SCHEDULE, null, { tz: 'UTC' });
                console.log(`📅 Scheduled Worker: ${w.QUEUE_NAME} at ${w.SCHEDULE}`);
            }

            await queue.work(w.QUEUE_NAME, w.default);
            console.log(`👷 Registered Worker: ${w.QUEUE_NAME}`);
        }

    } catch (err) {
        console.error('❌ Failed to start worker manager:', err);
        // Do NOT exit (shares process with API)
    }
}

// Start Standalone (if run via 'node src/worker.js')
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    startWorker();
}
