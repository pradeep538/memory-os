
import db from './src/db/index.js';
import axios from 'axios';

const ADMIN_API = 'http://localhost:3000/api/v1/admin';

async function verifyDismissal() {
    console.log('🕵️‍♀️ Verifying Daily Dismissal Logic...');

    // 1. Get the "Coffee" Pattern
    const res = await axios.get(`${ADMIN_API}/patterns`);
    const coffeePattern = res.data.data.find(p => p.body.includes('coffee'));

    if (!coffeePattern) {
        console.error('❌ Could not find "Coffee" pattern. Run seed first.');
        process.exit(1);
    }
    const id = coffeePattern.id;
    console.log(`🎯 Target Pattern: ${id} ("${coffeePattern.body}")`);
    console.log(`   Current State: is_read=${coffeePattern.is_read}`);

    // 2. Simulate User Dismissal (Mark as Read)
    console.log('\n👇 Simulating User Dismissal...');
    await db.query('UPDATE feed_items SET is_read = true, updated_at = NOW() WHERE id = $1', [id]);
    console.log('✅ Pattern dismissed (marked as read).');

    // 3. Trigger Analysis IMMEDIATELY (Should stay hidden)
    console.log('\n🔄 Triggering Analysis (Immediate)...');
    await axios.post(`${ADMIN_API}/analyze`, { userId: coffeePattern.user_id });

    const check1 = await db.query('SELECT is_read FROM feed_items WHERE id = $1', [id]);
    const isRead1 = check1.rows[0].is_read;
    console.log(`   Result: is_read=${isRead1} ${isRead1 ? '✅ (Hidden/Correct)' : '❌ (Resurfaced/Fail)'}`);

    if (!isRead1) {
        console.error('❌ Failed: Pattern resurfaced too early!');
        process.exit(1);
    }

    // 4. Time Travel (Pretend it's tomorrow)
    console.log('\n⏰ Time Traveling: Setting last update to 25 hours ago...');
    await db.query(`UPDATE feed_items SET updated_at = NOW() - INTERVAL '25 hours' WHERE id = $1`, [id]);

    // 5. Trigger Analysis AGAIN (Should resurface)
    console.log('\n🔄 Triggering Analysis (After 25 hours)...');
    await axios.post(`${ADMIN_API}/analyze`, { userId: coffeePattern.user_id });

    const check2 = await db.query('SELECT is_read FROM feed_items WHERE id = $1', [id]);
    const isRead2 = check2.rows[0].is_read;
    console.log(`   Result: is_read=${isRead2} ${!isRead2 ? '✅ (Resurfaced/Correct)' : '❌ (Still Hidden/Fail)'}`);

    if (!isRead2) {
        console.log('🎉 SUCCESS: Daily Dismissal Logic verified!');
    } else {
        console.error('❌ Failed: Pattern did not resurface.');
    }

    process.exit(0);
}

verifyDismissal();
