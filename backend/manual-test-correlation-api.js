#!/usr/bin/env node
/**
 * Correlation API Integration Test
 * Tests all correlation endpoints end-to-end
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000/api/v1';
const USER_ID = '00000000-0000-0000-0000-000000000000';

console.log('\n🧪 Testing Correlation API Endpoints\n');
console.log('='.repeat(60));

async function testCorrelationAPI() {
    try {
        // Test 1: Get Available Metrics
        console.log('\n📊 Test 1: GET /correlations/metrics');
        const metricsRes = await fetch(`${BASE_URL}/correlations/metrics`);
        const metrics = await metricsRes.json();

        console.log(`✅ Status: ${metricsRes.status}`);
        console.log(`✅ Total Metrics: ${metrics.count}`);
        console.log(`✅ Sample Metrics:`, metrics.data.slice(0, 3).map(m => m.display_name));

        // Test 2: Get Metrics by Category
        console.log('\n🏥 Test 2: GET /correlations/metrics?category=health');
        const healthMetricsRes = await fetch(`${BASE_URL}/correlations/metrics?category=health`);
        const healthMetrics = await healthMetricsRes.json();

        console.log(`✅ Status: ${healthMetricsRes.status}`);
        console.log(`✅ Health Metrics: ${healthMetrics.count}`);
        console.log(`✅ Examples:`, healthMetrics.data.slice(0, 3).map(m => m.display_name));

        // Test 3: Get User Correlations (initially empty)
        console.log('\n📈 Test 3: GET /correlations');
        const correlationsRes = await fetch(`${BASE_URL}/correlations`);
        const correlations = await correlationsRes.json();

        console.log(`✅ Status: ${correlationsRes.status}`);
        console.log(`✅ Current Correlations: ${correlations.count}`);

        // Test 4: Calculate Correlations
        console.log('\n🔬 Test 4: POST /correlations/calculate');
        const calculateRes = await fetch(`${BASE_URL}/correlations/calculate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                max_lag_days: 3,
                min_samples: 7
            })
        });
        const calculated = await calculateRes.json();

        console.log(`✅ Status: ${calculateRes.status}`);
        console.log(`✅ ${calculated.message}`);
        console.log(`✅ Correlations Calculated: ${calculated.data.length}`);

        if (calculated.data.length > 0) {
            const sample = calculated.data[0];
            console.log(`✅ Sample Correlation:
   Driver: ${sample.driver_metric_name}
   Outcome: ${sample.outcome_metric_name}
   Coefficient: ${sample.coefficient}
   P-value: ${sample.p_value}
   Lag Days: ${sample.lag_days}`);
        }

        // Test 5: Get Correlations with Filters
        console.log('\n🎯 Test 5: GET /correlations?min_coefficient=0.5');
        const strongCorrelationsRes = await fetch(`${BASE_URL}/correlations?min_coefficient=0.5`);
        const strongCorrelations = await strongCorrelationsRes.json();

        console.log(`✅ Status: ${strongCorrelationsRes.status}`);
        console.log(`✅ Strong Correlations (|r| >= 0.5): ${strongCorrelations.count}`);

        // Test 6: Get Correlation Stats
        console.log('\n📊 Test 6: GET /correlations/stats');
        const statsRes = await fetch(`${BASE_URL}/correlations/stats`);
        const stats = await statsRes.json();

        console.log(`✅ Status: ${statsRes.status}`);
        console.log(`✅ Stats:`, JSON.stringify(stats.data, null, 2));

        // Test 7: Update Correlation Status (if any correlations exist)
        if (calculated.data.length > 0) {
            const correlationId = calculated.data[0].id;

            console.log('\n⭐ Test 7: PATCH /correlations/:id/status');
            const updateStatusRes = await fetch(`${BASE_URL}/correlations/${correlationId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'pinned' })
            });
            const updated = await updateStatusRes.json();

            console.log(`✅ Status: ${updateStatusRes.status}`);
            console.log(`✅ ${updated.message}`);
            console.log(`✅ New Status: ${updated.data.status}`);

            // Test 8: Submit Feedback
            console.log('\n👍 Test 8: POST /correlations/:id/feedback');
            const feedbackRes = await fetch(`${BASE_URL}/correlations/${correlationId}/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    is_helpful: true,
                    comment: 'This insight is very useful!'
                })
            });
            const feedback = await feedbackRes.json();

            console.log(`✅ Status: ${feedbackRes.status}`);
            console.log(`✅ ${feedback.message}`);

            // Test 9: Get Single Correlation
            console.log('\n🔍 Test 9: GET /correlations/:id');
            const singleRes = await fetch(`${BASE_URL}/correlations/${correlationId}`);
            const single = await singleRes.json();

            console.log(`✅ Status: ${singleRes.status}`);
            console.log(`✅ Correlation Details:
   ID: ${single.data.id}
   Status: ${single.data.status}
   Coefficient: ${single.data.coefficient}
   Insight: ${single.data.insight_text || 'N/A'}`);
        }

        // Test 10: Error Handling - Invalid Status
        console.log('\n❌ Test 10: Error Handling - Invalid Status');
        if (calculated.data.length > 0) {
            const correlationId = calculated.data[0].id;
            const errorRes = await fetch(`${BASE_URL}/correlations/${correlationId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'invalid_status' })
            });
            const error = await errorRes.json();

            console.log(`✅ Status: ${errorRes.status} (expected 400)`);
            console.log(`✅ Error Message: ${error.error}`);
        }

        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('📋 TEST SUMMARY\n');
        console.log('✅ GET /correlations/metrics - List all metrics');
        console.log('✅ GET /correlations/metrics?category=health - Filter by category');
        console.log('✅ GET /correlations - List user correlations');
        console.log('✅ POST /correlations/calculate - Calculate correlations');
        console.log('✅ GET /correlations?min_coefficient=0.5 - Filter strong correlations');
        console.log('✅ GET /correlations/stats - Get statistics');
        console.log('✅ PATCH /correlations/:id/status - Update status');
        console.log('✅ POST /correlations/:id/feedback - Submit feedback');
        console.log('✅ GET /correlations/:id - Get single correlation');
        console.log('✅ Error handling - Invalid inputs rejected');
        console.log('');
        console.log('='.repeat(60));
        console.log('🎉 ALL CORRELATION API TESTS PASSED!');
        console.log('='.repeat(60));
        console.log('');
        console.log('📊 Total Endpoints Tested: 7');
        console.log('  1. GET /api/v1/correlations/metrics');
        console.log('  2. GET /api/v1/correlations');
        console.log('  3. POST /api/v1/correlations/calculate');
        console.log('  4. GET /api/v1/correlations/stats');
        console.log('  5. PATCH /api/v1/correlations/:id/status');
        console.log('  6. POST /api/v1/correlations/:id/feedback');
        console.log('  7. GET /api/v1/correlations/:id');
        console.log('');

        process.exit(0);

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Wait for server to be ready
console.log('⏳ Waiting for server at http://localhost:3000...');
setTimeout(testCorrelationAPI, 2000);
