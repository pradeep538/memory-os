
import db from './src/db/index.js';

async function flushPatterns() {
    console.log('🧹 Flushing Pattern Feed Items...');
    const res = await db.query(`
        DELETE FROM feed_items 
        WHERE type = 'pattern'
        RETURNING *
    `);
    console.log(`✅ Deleted ${res.rowCount} pattern items.`);
    process.exit(0);
}

flushPatterns();
