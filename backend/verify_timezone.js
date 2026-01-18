
import axios from 'axios';
import db from './src/db/index.js';
import { v4 as uuidv4 } from 'uuid';

const API = 'http://localhost:3000/api/v1/admin/analyze';
const EMAIL = 'timezone_test@memoryos.app';

async function verifyTimezone() {
    console.log('🌍 Verifying Timezone Awareness...');

    // 1. Setup User (Ensure consistent user)
    let user = (await db.query('SELECT * FROM users WHERE email = $1', [EMAIL])).rows[0];
    if (!user) {
        user = (await db.query(
            "INSERT INTO users (username, email, subscription_tier, timezone) VALUES ($1, $2, 'pro', 'America/New_York') RETURNING *",
            ['timezone_tester', EMAIL]
        )).rows[0];
        console.log('   👤 Created new test user.');
    } else {
        await db.query("UPDATE users SET timezone = 'America/New_York' WHERE id = $1", [user.id]);
        console.log('   👤 Updated existing user timezone.');
    }
    const userId = user.id;

    // 2. Clear Data
    await db.query('DELETE FROM memory_units WHERE user_id = $1', [userId]);
    await db.query('DELETE FROM feed_items WHERE user_id = $1', [userId]);
    console.log('   🧹 Cleared old data.');

    // 3. Seed "Morning Coffee" (8 AM UTC)
    console.log('   🌱 Seeding "Morning Coffee" (4x, 8 AM UTC)...');
    const now = new Date();
    for (let i = 0; i < 4; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        date.setUTCHours(8, 0, 0, 0); // 08:00 UTC = 03:00 EST (America/New_York)

        await db.query(`
            INSERT INTO memory_units (id, user_id, raw_input, source, status, created_at, normalized_data, category)
            VALUES ($1, $2, 'Drank coffee', 'text', 'validated', $3, $4, 'health')
        `, [
            uuidv4(),
            userId,
            date.toISOString(),
            JSON.stringify({ activity: 'drink coffee', original_text: 'Drank coffee' })
        ]);
    }

    // 3.5 Check Data
    const countRes = await db.query('SELECT COUNT(*) FROM memory_units WHERE user_id = $1', [userId]);
    const count = countRes.rows[0].count;
    console.log(`   📊 DB Verification: Found ${count} memories for user.`);

    // 4. Trigger Analysis
    console.log('\n🚀 Triggering Analysis...');
    try {
        const res = await axios.post(API, { userId }); // Pass userId explicitely
        const patterns = res.data.data;

        if (!patterns || patterns.length === 0) {
            console.error('❌ No patterns found. Check Python service.');
            console.log(JSON.stringify(res.data, null, 2));
            process.exit(1);
        }

        const p1 = patterns[0];
        if (!p1.saved_item) {
            console.error('❌ Pattern skipped (Not Novel?).');
            console.log(`   Reasoning: ${p1.novelty?.reasoning}`);
            process.exit(1);
        }

        const body = p1.saved_item.body;
        console.log(`   💡 Insight Body: "${body}"`);

        // Check for "3 AM" or "Night"
        const isLocalTime = body.includes('3 AM') || body.includes('3:00') || body.toLowerCase().includes('night') || body.toLowerCase().includes('early morning');

        if (isLocalTime) {
            console.log('✅ SUCCESS: Insight converted UTC (8AM) to Local (3AM/Night).');
        } else {
            console.warn('⚠️ WARNING: Insight does not look like Local Time. Check output above.');
            console.log(`   Expected: 3 AM / Night. Got: ${body}`);
            process.exit(1);
        }

    } catch (e) {
        console.error(e.response?.data || e.message);
        process.exit(1);
    }

    process.exit(0);
}

verifyTimezone();
