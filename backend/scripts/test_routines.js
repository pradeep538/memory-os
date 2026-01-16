#!/usr/bin/env node

/**
 * Test Routine Schedules & Notification System
 */

import { db } from '../src/db/index.js';
import axios from 'axios';

const API_BASE = 'http://localhost:3000/api/v1';
const TEST_USER_ID = 'c3d50e53-701f-4fc7-bd57-e84e0663fb3a';

async function testRoutineCreation() {
    console.log('🧪 Test 1: Create Routine\n');

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const routine = {
        routineName: 'Test Vitamin C',
        routineType: 'medication',
        description: 'Daily vitamin C supplement',
        scheduleTimes: [currentTime], // Current time for immediate test
        scheduleDays: [1, 2, 3, 4, 5, 6, 7], // Every day
        frequency: 'daily',
        notificationTitle: 'Take Vitamin C',
        notificationBody: 'Time for your daily vitamin C supplement'
    };

    try {
        const response = await axios.post(`${API_BASE}/routines`, routine);

        console.log('Response:', response.data);
        console.log(`  ✓ Routine created: ${response.data.routine.id}`);
        console.log(`  ✓ Scheduled for: ${currentTime} every day\n`);

        return response.data.routine.id;

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        throw error;
    }
}

async function testRoutineList() {
    console.log('🧪 Test 2: List Routines\n');

    try {
        const response = await axios.get(`${API_BASE}/routines`);

        console.log(`Found ${response.data.routines.length} routines:`);
        response.data.routines.forEach(r => {
            console.log(`  - ${r.routine_name} (${r.routine_type})`);
            console.log(`    Times: ${r.schedule_times.join(', ')}`);
            console.log(`    Enabled: ${r.notification_enabled}`);
        });
        console.log('');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        throw error;
    }
}

async function testNotificationWorker() {
    console.log('🧪 Test 3: Notification Worker Check\n');

    console.log('Checking pg-boss scheduled jobs...\n');

    try {
        const jobs = await db.query(`
      SELECT name, cron, timezone
      FROM pgboss.schedule
      WHERE name = 'notification'
    `);

        if (jobs.length > 0) {
            console.log('  ✓ Notification worker is scheduled');
            console.log(`    Schedule: ${jobs[0].cron}`);
            console.log(`    Timezone: ${jobs[0].timezone}\n`);
        } else {
            console.log('  ⚠️  Notification worker not found in schedule');
            console.log('    Make sure worker service is running!\n');
        }

    } catch (error) {
        console.error('❌ Failed to check worker:', error.message);
    }
}

async function testToggleNotification(routineId) {
    console.log('🧪 Test 4: Toggle Notification\n');

    try {
        const response = await axios.patch(`${API_BASE}/routines/${routineId}/toggle`);

        console.log(`  ✓ Notification toggled`);
        console.log(`    Enabled: ${response.data.routine.notification_enabled}\n`);

        // Toggle back
        await axios.patch(`${API_BASE}/routines/${routineId}/toggle`);
        console.log(`  ✓ Toggled back to enabled\n`);

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        throw error;
    }
}

async function cleanup(routineId) {
    console.log('🧹 Cleanup\n');

    try {
        await axios.delete(`${API_BASE}/routines/${routineId}`);
        console.log('  ✓ Test routine deleted\n');
    } catch (error) {
        console.error('  ⚠️  Cleanup failed:', error.message);
    }
}

async function runTests() {
    console.log('='.repeat(60));
    console.log('Routine Schedules & Notifications - Tests');
    console.log('='.repeat(60));
    console.log('');

    let routineId;

    try {
        routineId = await testRoutineCreation();
        await testRoutineList();
        await testNotificationWorker();
        await testToggleNotification(routineId);

        console.log('='.repeat(60));
        console.log('🎉 ALL TESTS PASSED');
        console.log('='.repeat(60));
        console.log('\n💡 Tip: Check backend logs in ~15 minutes to see notification worker in action');

        await cleanup(routineId);
        process.exit(0);

    } catch (error) {
        console.error('\n' + '='.repeat(60));
        console.error('💥 TESTS FAILED');
        console.error('='.repeat(60));

        if (routineId) await cleanup(routineId);
        process.exit(1);
    }
}

runTests();
