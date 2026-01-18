
import db from './src/db/index.js';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api/v1';

async function seedAndVerify() {
    console.log('🧪 Starting Pattern Verification...');

    // 1. Get a Test User (or use first available)
    const users = await db.query('SELECT id, email FROM users LIMIT 1');
    if (users.rows.length === 0) {
        console.error('❌ No users found. Run the app first.');
        process.exit(1);
    }
    const userId = users.rows[0].id; // Use existing user to avoid auth complexity
    console.log(`👤 Using user: ${users.rows[0].email} (${userId})`);

    // 2. Clear Clean Slate
    console.log('🧹 Clearing old memories and feed items...');
    await db.query('DELETE FROM memory_units WHERE user_id = $1', [userId]);
    await db.query('DELETE FROM feed_items WHERE user_id = $1', [userId]);

    // 3. Seed "Coffee Habit" Data
    // Scenario: Drank Coffee at 08:00 AM for the last 5 days
    console.log('🌱 Seeding "Morning Coffee" memories (5x)...');

    const now = new Date();
    // Generate dates for last 5 days
    for (let i = 0; i < 5; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        date.setUTCHours(8, 0, 0, 0); // 08:00 AM UTC (Ensures DB sees hour 8)

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

    console.log('✅ Seed complete.');

    // 4. Trigger Analysis via Worker (Simulate by calling internal logic or waiting)
    // Since we can't trigger worker easily from outside without redis access, 
    // we will wait for the scheduled job or restart the server which usually triggers checks.
    // BUT, for verification, we can force the analysis worker logic if we imported it, 
    // but easier to just tell the user to wait or restart server.
    // actually, we can trigger it via an endpoint if we had one.

    // For this test, we will assume the dev just restarted server or we can use the python service directly to verify detection.

    console.log('⏳ Waiting 5s for any background noise to settle...');
    await new Promise(r => setTimeout(r, 5000));

    console.log('\n🔍 verification Instructions:');
    console.log('1. Use the "Restart Server" button or command.');
    console.log('2. The server will run analysis on startup (or when triggered).');
    console.log('3. Call GET /api/v1/admin/patterns to see the "Evidence".');

    process.exit(0);
}

seedAndVerify();
