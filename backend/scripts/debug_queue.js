
// backend/scripts/debug_queue.js
import { query } from '../src/db/index.js';

async function main() {
    try {
        console.log('🐘 Debugging PgBoss Queue...');

        // Check jobs
        const jobsRes = await query(`
            SELECT id, name, state, created_on, started_on, completed_on, output, data
            FROM pgboss.job
            ORDER BY created_on DESC
            LIMIT 10;
        `);

        console.log(`\nFound ${jobsRes.rows.length} recent jobs:`);
        jobsRes.rows.forEach(job => {
            console.log(`- [${job.id}] ${job.name} | State: ${job.state} | Created: ${job.created_on}`);
            console.log(`   Data: ${JSON.stringify(job.data)}`);
            if (job.output) console.log(`   Output: ${JSON.stringify(job.output)}`);
        });

    } catch (err) {
        console.error('Error:', err);
    }
}

main();
