
import { query } from '../src/db/index.js';
import fetch from 'node-fetch';

async function seedPlan() {
    const firebaseUid = 'ubT6IdK9AZf8goNJWbI8cqChmS82';

    // Get user ID
    const userRes = await query('SELECT id FROM users WHERE firebase_uid = $1', [firebaseUid]);
    if (userRes.rows.length === 0) {
        console.error('User not found');
        process.exit(1);
    }
    const userId = userRes.rows[0].id;
    console.log(`seeding plan for user ${userId}`);

    // Generate Plan via API (simulating internal call or just inserting)
    // Actually, let's insert directly for reliability matching planGenerator logic

    const plan = {
        name: 'Build Workout Consistency',
        description: 'Progressive plan to establish regular workout routine',
        duration_weeks: 4,
        phases: JSON.stringify([
            { week: 1, goal: 'Build the habit of showing up', target: '2x/week' },
            { week: 2, goal: 'Increase frequency', target: '3x/week' },
            { week: 3, goal: 'Establish routine', target: '3x/week' },
            { week: 4, goal: 'Solidify habit', target: '4x/week' }
        ]),
        status: 'active',
        start_date: new Date(),
        category: 'fitness',
        progress: 0
    };

    const res = await query(`
        INSERT INTO plans (user_id, plan_name, description, duration_weeks, phases, status, start_date, category, progress)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
    `, [userId, plan.name, plan.description, plan.duration_weeks, plan.phases, plan.status, plan.start_date, plan.category, plan.progress]);

    console.log(`✅ Plan Seeded: ${res.rows[0].id}`);
    process.exit(0);
}

seedPlan().catch(console.error);
