
import { query } from './src/db/index.js';

async function cleanPatterns() {
    try {
        console.log('Cleaning pattern feed items...');
        const res = await query("DELETE FROM feed_items WHERE type = 'pattern'");
        console.log(`Deleted ${res.rowCount} items.`);
    } catch (err) {
        console.error('Error cleaning patterns:', err);
        process.exit(1);
    }
    process.exit(0);
}

cleanPatterns();
