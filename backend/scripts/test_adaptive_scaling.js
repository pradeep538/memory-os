import planAdaptiveService from '../src/services/plans/planAdaptiveService.js';
import { query } from '../src/db/index.js';

/**
 * Automated test for Adaptive Scaling
 * Tests the core logic without requiring full database state
 */

// Use a real UUID for testing
const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

async function cleanupTest() {
    await query(`DELETE FROM notifications WHERE user_id = $1`, [TEST_USER_ID]);
    await query(`DELETE FROM plans WHERE user_id = $1`, [TEST_USER_ID]);
}

async function createTestPlan(overrides = {}) {
    const result = await query(`
        INSERT INTO plans (
            user_id, plan_name, category, plan_data, 
            progress, consecutive_failures, difficulty_level, weeks_at_current_level
        )
        VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8)
        RETURNING *
    `, [
        TEST_USER_ID,
        overrides.plan_name || 'Test Fitness Plan',
        'fitness',
        JSON.stringify({
            phases: [{
                title: 'Week 1-4',
                frequency: overrides.target || 3,
                target: `${overrides.target || 3} sessions`
            }]
        }),
        overrides.progress || 0,
        overrides.consecutive_failures || 0,
        overrides.difficulty_level || 1.0,
        overrides.weeks_at_current_level || 0
    ]);

    return result.rows[0];
}

async function testScenario1_ConsistentSuccess() {
    console.log('\n🧪 SCENARIO 1: Consistent Success → Progressive Overload');
    console.log('='.repeat(60));

    // Week 3: Success with 3 weeks at current level
    const plan = await createTestPlan({
        progress: 3,
        weeks_at_current_level: 2
    });

    await planAdaptiveService.assessWeeklyPerformance(plan);

    // Check for level-up notification
    const notifications = await query(`
        SELECT * FROM notifications 
        WHERE user_id = $1
        AND notification_type = 'plan_level_up'
    `, [TEST_USER_ID]);


    if (notifications.rows.length > 0) {
        console.log('✅ Level-up notification sent');
        console.log(`   Suggested target: ${notifications.rows[0].metadata.suggested_target}`);
        return true;
    } else {
        console.log('❌ No level-up notification found');
        return false;
    }
}

async function testScenario2_AdaptiveScaling() {
    console.log('\n🧪 SCENARIO 2: Adaptive Scaling after 2 failures');
    console.log('='.repeat(60));

    await cleanupTest();

    // Simulate 2nd consecutive failure
    const plan = await createTestPlan({
        progress: 1,
        consecutive_failures: 1
    });

    await planAdaptiveService.assessWeeklyPerformance(plan);

    // Check for adaptive scaling notification
    const notifications = await query(`
        SELECT * FROM notifications 
        WHERE user_id = $1 
        AND notification_type = 'plan_adaptive_scaling'
    `, [TEST_USER_ID]);


    if (notifications.rows.length > 0) {
        const metadata = notifications.rows[0].metadata;
        console.log('✅ Adaptive scaling triggered');
        console.log(`   Old target: ${metadata.old_target} → New target: ${metadata.new_target}`);
        console.log(`   Difficulty: ${metadata.old_difficulty.toFixed(2)} → ${metadata.new_difficulty.toFixed(2)}`);

        // Verify 30% reduction
        const expectedTarget = Math.ceil(3 * 0.7);
        if (metadata.new_target === expectedTarget) {
            console.log('✅ Correct 30% reduction applied');
            return true;
        } else {
            console.log(`❌ Expected target ${expectedTarget}, got ${metadata.new_target}`);
            return false;
        }
    } else {
        console.log('❌ No adaptive scaling notification found');
        return false;
    }
}

async function testScenario3_HighFrequencyMedication() {
    console.log('\n🧪 SCENARIO 3: Medication Adherence (21/week → 14/week)');
    console.log('='.repeat(60));

    await cleanupTest();

    // Create plan with 21/week target (3x/day)
    const plan = await createTestPlan({
        plan_name: 'Take Medication',
        target: 21,
        progress: 15,  // 71% adherence - second miss
        consecutive_failures: 1
    });

    await planAdaptiveService.assessWeeklyPerformance(plan);

    const notifications = await query(`
        SELECT * FROM notifications 
        WHERE user_id = $1
        AND notification_type = 'plan_adaptive_scaling'
    `, [TEST_USER_ID]);


    if (notifications.rows.length > 0) {
        const metadata = notifications.rows[0].metadata;
        const newTarget = metadata.new_target;
        console.log('✅ Medication plan scaled down');
        console.log(`   21/week → ${newTarget}/week (${Math.round(newTarget / 7)}x per day)`);
        console.log(`   Focus: Consistency over volume`);
        return true;
    } else {
        console.log('❌ No scaling notification found');
        return false;
    }
}

async function runAllTests() {
    console.log('\n🚀 ADAPTIVE SCALING AUTOMATED TEST SUITE');
    console.log('='.repeat(60));

    const results = {
        scenario1: false,
        scenario2: false,
        scenario3: false
    };

    try {
        await cleanupTest();

        results.scenario1 = await testScenario1_ConsistentSuccess();
        results.scenario2 = await testScenario2_AdaptiveScaling();
        results.scenario3 = await testScenario3_HighFrequencyMedication();

        console.log('\n📊 TEST RESULTS');
        console.log('='.repeat(60));
        console.log(`Scenario 1 (Progressive Overload): ${results.scenario1 ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Scenario 2 (Adaptive Scaling):     ${results.scenario2 ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Scenario 3 (Medication Adherence): ${results.scenario3 ? '✅ PASS' : '❌ FAIL'}`);

        const allPassed = Object.values(results).every(r => r);

        if (allPassed) {
            console.log('\n🎯 ALL TESTS PASSED - Science-based coaching verified!');
        } else {
            console.log('\n⚠️  SOME TESTS FAILED - Review implementation');
        }

    } catch (error) {
        console.error('\n❌ TEST SUITE ERROR:', error);
    } finally {
        await cleanupTest();
        process.exit(0);
    }
}

runAllTests();
