
import db from '../src/db/index.js';

async function cleanup() {
    try {
        console.log('🧹 Cleaning up test data...');
        const res = await db.query("DELETE FROM memory_units WHERE raw_input LIKE 'Meditated for%'");
        console.log(`✅ Deleted ${res.rowCount} test memories.`);
    } catch (err) {
        console.error('Error cleaning up:', err);
    } finally {
        process.exit();
    }
}

cleanup();
