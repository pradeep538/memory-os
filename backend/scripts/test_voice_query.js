#!/usr/bin/env node

/**
 * Test Voice Query System End-to-End
 * 
 * This script tests the complete voice query flow:
 * 1. Seed test data (medication logs)
 * 2. Query via text endpoint
 * 3. Verify response structure
 * 4. Verify consistency data
 */

import { db } from '../src/db/index.js';
import axios from 'axios';

const API_BASE = 'http://localhost:3000/api/v1';
const TEST_USER_ID = 'c3d50e53-701f-4fc7-bd57-e84e0663fb3a';

async function seedTestData() {
    console.log('📝 Seeding test data...\n');

    // Clear existing test data
    await db.query(`
    DELETE FROM memory_units 
    WHERE user_id = ? 
      AND raw_input LIKE '%vitamin C%'
  `, [TEST_USER_ID]);

    // Insert test logs (7 days, 1 missing)
    const logs = [
        { text: 'I took vitamin C', daysAgo: 0 }, // Today
        { text: 'Took my vitamin C supplement', daysAgo: 1 }, // Yesterday
        // Skip day 2 (missing)
        { text: 'Had vitamin C', daysAgo: 3 },
        { text: 'Vitamin C taken', daysAgo: 4 },
        { text: 'Took vitamin-C', daysAgo: 5 },
        { text: 'VitC done', daysAgo: 6 }
    ];

    for (const log of logs) {
        const date = new Date();
        date.setDate(date.getDate() - log.daysAgo);
        date.setHours(8, 15, 0, 0);

        await db.query(`
      INSERT INTO memory_units (
        id, user_id, raw_input, source, 
        category, normalized_data, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
            `test-mem-${log.daysAgo}`,
            TEST_USER_ID,
            log.text,
            'text',
            'health',
            JSON.stringify({ medication: 'vitamin C' }),
            'validated',
            date.toISOString()
        ]);

        console.log(`  ✓ Logged: "${log.text}" (${log.daysAgo} days ago)`);
    }

    console.log('\n✅ Test data seeded\n');
}

async function testCheckToday() {
    console.log('🧪 Test 1: CHECK_TODAY query\n');

    try {
        const response = await axios.post(`${API_BASE}/query/text`, {
            question: 'Did I take vitamin C today?'
        });

        const { success, answer, subject, query_type, consistency } = response.data;

        console.log('Response:');
        console.log(`  Question: "Did I take vitamin C today?"`);
        console.log(`  Answer: "${answer}"`);
        console.log(`  Subject: ${subject}`);
        console.log(`  Query Type: ${query_type}`);
        console.log(`\nConsistency:`);
        console.log(`  Pattern: [${consistency.pattern.join(', ')}]`);
        console.log(`  Adherence: ${consistency.adherence_percentage}%`);
        console.log(`  Streak: ${consistency.current_streak} days`);
        console.log(`  Total Logged: ${consistency.total_logged}/${consistency.days_tracked}`);

        // Assertions
        if (!success) throw new Error('Request failed');
        if (!answer.toLowerCase().includes('yes')) throw new Error('Expected "yes" in answer');
        if (query_type !== 'CHECK_TODAY') throw new Error(`Expected CHECK_TODAY, got ${query_type}`);
        if (consistency.total_logged !== 6) throw new Error(`Expected 6 logs, got ${consistency.total_logged}`);
        if (consistency.adherence_percentage !== 86) throw new Error(`Expected 86% adherence, got ${consistency.adherence_percentage}%`);

        console.log('\n✅ Test 1 PASSED\n');

    } catch (error) {
        console.error('❌ Test 1 FAILED:', error.message);
        throw error;
    }
}

async function testLastOccurrence() {
    console.log('🧪 Test 2: LAST_OCCURRENCE query\n');

    // Add a plant watering log
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    threeDaysAgo.setHours(10, 0, 0, 0);

    await db.query(`
    INSERT INTO memory_units (
      id, user_id, raw_input, source,
      category, normalized_data, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
        'test-plant-1',
        TEST_USER_ID,
        'Watered the cacti',
        'text',
        'home',
        JSON.stringify({ activity: 'water plants' }),
        'validated',
        threeDaysAgo.toISOString()
    ]);

    try {
        const response = await axios.post(`${API_BASE}/query/text`, {
            question: 'When did I last water the cacti?'
        });

        const { success, answer, query_type } = response.data;

        console.log('Response:');
        console.log(`  Question: "When did I last water the cacti?"`);
        console.log(`  Answer: "${answer}"`);
        console.log(`  Query Type: ${query_type}`);

        // Assertions
        if (!success) throw new Error('Request failed');
        if (!answer.includes('3 days ago')) throw new Error('Expected "3 days ago" in answer');
        if (query_type !== 'LAST_OCCURRENCE') throw new Error(`Expected LAST_OCCURRENCE, got ${query_type}`);

        console.log('\n✅ Test 2 PASSED\n');

    } catch (error) {
        console.error('❌ Test 2 FAILED:', error.message);
        throw error;
    }
}

async function testTypoResistance() {
    console.log('🧪 Test 3: Typo resistance\n');

    const typoVariants = [
        'Did I take my vitC today?',
        'Did I do vitamin-C today?',
        'Have I taken vitamin C?'
    ];

    for (const question of typoVariants) {
        try {
            const response = await axios.post(`${API_BASE}/query/text`, {
                question
            });

            const { success, answer } = response.data;

            console.log(`  ✓ "${question}"`);
            console.log(`    → "${answer}"`);

            if (!success || !answer.toLowerCase().includes('yes')) {
                throw new Error(`Failed for: ${question}`);
            }

        } catch (error) {
            console.error(`  ❌ Failed: ${question}`);
            throw error;
        }
    }

    console.log('\n✅ Test 3 PASSED\n');
}

async function cleanup() {
    console.log('🧹 Cleaning up test data...\n');

    await db.query(`
    DELETE FROM memory_units 
    WHERE user_id = ? 
      AND (raw_input LIKE '%vitamin C%' OR raw_input LIKE '%cacti%')
  `, [TEST_USER_ID]);

    console.log('✅ Cleanup complete\n');
}

async function runTests() {
    console.log('='.repeat(60));
    console.log('Voice Query System - Integration Tests');
    console.log('='.repeat(60));
    console.log('');

    try {
        await seedTestData();
        await testCheckToday();
        await testLastOccurrence();
        await testTypoResistance();

        console.log('='.repeat(60));
        console.log('🎉 ALL TESTS PASSED');
        console.log('='.repeat(60));

        await cleanup();
        process.exit(0);

    } catch (error) {
        console.error('\n' + '='.repeat(60));
        console.error('💥 TESTS FAILED');
        console.error('='.repeat(60));
        console.error(error);

        await cleanup();
        process.exit(1);
    }
}

runTests();
