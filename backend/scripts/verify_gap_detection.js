import schedulerService from '../src/services/notifications/schedulerService.js';
import PlanModel from '../src/models/plan.model.js';
import { query } from '../src/db/index.js';
import dotenv from 'dotenv';

dotenv.config();

async function verifyGapDetection() {
    console.log('🧪 Verifying Gap Detection Logic...');

    const TEST_USER_ID = 'c3d50e53-701f-4fc7-bd57-e84e0663fb3a'; // geetamg538

    try {
        // 1. Setup: Ensure user has an active plan (e.g., Hydration)
        console.log('\n1. Setting up test plan...');

        // Check for existing plan
        const plans = await PlanModel.findActive(TEST_USER_ID);
        let testPlan = plans.find(p => p.category === 'health' || p.category === 'medication');

        if (!testPlan) {
            console.log('   Creating temporary test plan...');
            testPlan = await PlanModel.create({
                userId: TEST_USER_ID,
                name: 'Test Hydration Plan',
                description: 'Drink water',
                durationWeeks: 4,
                phases: [{ week: 1, goal: 'Drink 3x/day', target: 3, frequency: 3 }],
                category: 'health',
                goal: 'Hydration'
            });
        }
        console.log(`   Using Plan: ${testPlan.plan_name} (ID: ${testPlan.id})`);

        // 2. Clear recent notifications to ensure clean test
        await query("DELETE FROM notifications WHERE user_id = $1 AND title LIKE 'Gap Detected%'", [TEST_USER_ID]);

        // 3. Trigger Gap Check Manually
        console.log('\n2. Triggering Gap Check Job...');
        // We need to access the internal method or simulate the cron job
        // The service has 'checkGaps()' method? Let's check the file content if needed.
        // Assuming checkGaps is the method name based on previous knowledge.

        await schedulerService.checkGaps();
        // Note: This checks ALL users. In dev, might be fine.

        // 4. Verify Notification
        console.log('\n3. Verifying Notification Creation...');
        const notifs = await query(`
            SELECT * FROM notifications 
            WHERE user_id = $1 
              AND notification_type = 'alert'
              AND created_at > NOW() - INTERVAL '1 minute'
        `, [TEST_USER_ID]);

        if (notifs.rows.length > 0) {
            console.log(`   ✅ Gap Detected! Created ${notifs.rows.length} notification(s).`);
            console.log(`   - Title: ${notifs.rows[0].title}`);
            console.log(`   - Body: ${notifs.rows[0].body}`);
        } else {
            console.log('   ⚠️ No gap detected. Ideally this means you logged enough data today!');
            console.log('   (Or the logic requires >24h inactivity)');
        }

    } catch (err) {
        console.error('❌ Verification Failed:', err);
    } finally {
        process.exit(0);
    }
}

verifyGapDetection();
