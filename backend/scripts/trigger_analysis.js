
// backend/scripts/trigger_analysis.js
import queue from '../src/lib/queue.js';

const DEMO_USER_ID = 'c3d50e53-701f-4fc7-bd57-e84e0663fb3a'; // From Authentication Phase
const MEMORY_ID = 'ea3fa0be-c206-48fc-9b38-25e7ca345e32'; // From Debug Queue output

async function main() {
    try {
        console.log('🧪 Triggering Immediate Analysis...');
        await queue.start();

        const jobId = await queue.send('memory.analysis', {
            userId: DEMO_USER_ID,
            memoryId: MEMORY_ID
        }); // No delay!

        console.log(`✅ Job Sent: ${jobId}`);
        process.exit(0);

    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

main();
