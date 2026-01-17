
import db from '../src/db/index.js';
import blueprintNotificationService from '../src/services/notifications/blueprintNotificationService.js';
import NotificationModel from '../src/models/notification.model.js';

// Mock FCM Service to avoid actual sends
import fcmService from '../src/services/notifications/fcmService.js';
fcmService.sendToUser = async (userId, title, body) => {
    console.log(`[MOCK FCM] Sent to ${userId}: ${title} - ${body}`);
    return true;
};

async function testBlueprintNotifications() {
    console.log('🧪 Testing Blueprint Notification Logic...');

    try {
        // 1. Setup: Create a test plan scheduled for NOW
        const now = new Date();
        const currentHour = String(now.getHours()).padStart(2, '0');
        const currentMinute = String(now.getMinutes()).padStart(2, '0');
        const currentTimeString = `${currentHour}:${currentMinute}`;

        console.log(`🕒 Current System Time: ${currentTimeString}`);

        const testUserId = '00000000-0000-0000-0000-000000000000'; // Demo user

        // Clean up old test data
        await db.query(`DELETE FROM plans WHERE plan_name = 'TEST_NOTIFICATION_PLAN'`);
        await db.query(`DELETE FROM notifications WHERE notification_type = 'blueprint_reminder' AND user_id = $1`, [testUserId]);

        // Insert Test Plan
        const planRes = await db.query(`
            INSERT INTO plans (
                user_id, plan_name, category, status, phases
            ) VALUES (
                $1, 'TEST_NOTIFICATION_PLAN', 'test', 'active',
                $2
            ) RETURNING id
        `, [
            testUserId,
            JSON.stringify([{ schedule: [currentTimeString], goal: "Test Goal" }])
        ]);

        const planId = planRes.rows[0].id;
        console.log(`✅ Created Test Plan ID: ${planId} with schedule: [${currentTimeString}]`);

        // 2. Run Check (First Pass) - Should Send
        console.log('\n--- Run 1: Should Send ---');
        await blueprintNotificationService.checkDueReminders();

        // Verify Log
        const logRes1 = await db.query(`
            SELECT * FROM notifications 
            WHERE related_plan_id = $1 AND notification_type = 'blueprint_reminder'
        `, [planId]);

        if (logRes1.rows.length === 1) {
            console.log('✅ Success: Notification logged in DB.');
        } else {
            console.error('❌ Failure: No notification logged.');
            process.exit(1);
        }

        // 3. Run Check (Second Pass) - Should be Idempotent (No Send)
        console.log('\n--- Run 2: Should SKIP (Idempotency) ---');
        // Mock FCM would log if called, but we check DB count
        await blueprintNotificationService.checkDueReminders();

        const logRes2 = await db.query(`
            SELECT * FROM notifications 
            WHERE related_plan_id = $1 AND notification_type = 'blueprint_reminder'
        `, [planId]);

        if (logRes2.rows.length === 1) {
            console.log('✅ Success: No duplicate notification created.');
        } else {
            console.error(`❌ Failure: Duplicate notifications found! Count: ${logRes2.rows.length}`);
            process.exit(1);
        }

        // Cleanup
        await db.query(`DELETE FROM plans WHERE id = $1`, [planId]);
        console.log('\n✨ Test Complete & Cleaned Up.');
        process.exit(0);

    } catch (e) {
        console.error('Test Failed:', e);
        process.exit(1);
    }
}

testBlueprintNotifications();
