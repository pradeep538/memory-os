
import axios from 'axios';
import db from './src/db/index.js';

const API = 'http://localhost:3000/api/v1/admin/analyze';

async function verifyNovelty() {
    console.log('🧠 Verifying Novelty Engine...');

    // 1. Clear Feed (Start Fresh)
    await db.query('DELETE FROM feed_items');
    console.log('🧹 Feed cleared.');

    // 2. First Trigger (Should be Novel)
    console.log('\n🚀 Trigger 1 (Fresh)...');
    try {
        const res1 = await axios.post(API, {});
        const patterns1 = res1.data.data;

        if (patterns1.length === 0) {
            console.error('❌ No patterns found! Did you run seed_patterns.js?');
            process.exit(1);
        }

        const p1 = patterns1[0];
        console.log(`   Result: ${p1.action.toUpperCase()}`);
        console.log(`   Reasoning: ${p1.novelty.reasoning}`);
        console.log(`   Body: "${p1.saved_item?.body}"`);

        if (p1.action !== 'upserted' || !p1.novelty.isNovel) {
            console.error('❌ Failed: First trigger should be NOVEL.');
            process.exit(1);
        }
    } catch (e) { console.error(e.response?.data || e.message); process.exit(1); }

    // 3. Second Trigger (Should be Repeat)
    console.log('\n🔄 Trigger 2 (Immediate Repeat)...');
    try {
        const res2 = await axios.post(API, {});
        const patterns2 = res2.data.data;
        const p2 = patterns2[0];

        console.log(`   Result: ${p2.action.toUpperCase()}`);
        console.log(`   Reasoning: ${p2.novelty.reasoning}`);

        if (p2.action === 'skipped' && !p2.novelty.isNovel) {
            console.log('✅ SUCCESS: Repeat was blocked!');
        } else {
            console.error('❌ Failed: Second trigger should be BLOCKED.');
            // Dump context to see why
            console.log(JSON.stringify(p2, null, 2));
            process.exit(1);
        }

    } catch (e) { console.error(e.response?.data || e.message); process.exit(1); }

    process.exit(0);
}

verifyNovelty();
