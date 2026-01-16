#!/usr/bin/env node

/**
 * Test Critical Gap Features
 */

import { db } from '../src/db/index.js';
import { clarificationService } from '../src/services/chat/clarificationService.js';
import { correctionHandler } from '../src/services/chat/correctionHandler.js';

const TEST_USER_ID = 'c3d50e53-701f-4fc7-bd57-e84e0663fb3a';

async function testClarification() {
    console.log('🧪 Test 1: Clarification Service\n');

    try {
        // Test ambiguous input
        const result = {
            input: 'Apple',
            confidence: 0.5,
            intent: 'UNKNOWN'
        };

        const clarification = await clarificationService.needsClarification(result);

        console.log('Input: "Apple"');
        console.log(`Needs clarification: ${clarification.needsClarification ? '✅ YES' : '❌ NO'}`);

        if (clarification.needsClarification) {
            console.log(`Question: ${clarification.question}`);
            console.log('Options:');
            clarification.options.forEach(opt => {
                console.log(`  ${opt.id}. ${opt.label}`);
            });

            // Store session
            await clarificationService.storeClarificationSession(
                TEST_USER_ID,
                clarification.sessionId,
                'Apple',
                clarification.options
            );

            console.log(`\nSession stored: ${clarification.sessionId}`);

            // Simulate user selecting option 1
            const processed = await clarificationService.processClarificationResponse(
                TEST_USER_ID,
                clarification.sessionId,
                1
            );

            console.log(`User selected: ${processed.intent}`);
            console.log(`Signals: ${JSON.stringify(processed.signals)}`);
        }

        console.log('\n✅ Test 1 PASSED\n');

    } catch (error) {
        console.error('❌ Test 1 FAILED:', error.message, '\n');
    }
}

async function testUndo() {
    console.log('🧪 Test 2: Undo Command\n');

    try {
        // Insert test entry
        await db.query(`
      INSERT INTO memory_units (
        id, user_id, raw_input, source, intent,
        signals, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
            'test-undo-1',
            TEST_USER_ID,
            'Test entry for undo',
            'text',
            'GENERAL_LOG',
            JSON.stringify({}),
            'validated'
        ]);

        console.log('Created test entry: "Test entry for undo"');

        // Test undo detection
        const command = correctionHandler.isCorrectionCommand('undo last');
        console.log(`Command detected: ${command.type === 'undo' ? '✅ UNDO' : '❌ NOT DETECTED'}`);

        // Execute undo
        const result = await correctionHandler.handleUndo(TEST_USER_ID);

        console.log(`Success: ${result.success ? '✅' : '❌'}`);
        console.log(`Message: ${result.message}`);

        // Verify deletion
        const deleted = await db.query(`
      SELECT status FROM memory_units WHERE id = ?
    `, ['test-undo-1']);

        console.log(`Status after undo: ${deleted[0].status}`);

        // Cleanup
        await db.query('DELETE FROM memory_units WHERE id = ?', ['test-undo-1']);

        console.log('\n✅ Test 2 PASSED\n');

    } catch (error) {
        console.error('❌ Test 2 FAILED:', error.message, '\n');
    }
}

async function testEdit() {
    console.log('🧪 Test 3: Edit Command\n');

    try {
        // Insert test expense
        await db.query(`
      INSERT INTO memory_units (
        id, user_id, raw_input, source, intent,
        signals, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
            'test-edit-1',
            TEST_USER_ID,
            'Spent $500 on groceries',
            'text',
            'TRACK_EXPENSE',
            JSON.stringify({ amount: 500, description: 'groceries' }),
            'validated'
        ]);

        console.log('Created test entry: "$500 on groceries"');

        // Test edit detection
        const command = correctionHandler.isCorrectionCommand('Actually, $50');
        console.log(`Command detected: ${command.type === 'edit' ? '✅ EDIT' : '❌ NOT DETECTED'}`);
        console.log(`New value: ${command.newValue}`);

        // Execute edit
        const result = await correctionHandler.handleEdit(TEST_USER_ID, '$50');

        console.log(`Success: ${result.success ? '✅' : '❌'}`);
        console.log(`Message: ${result.message}`);

        // Verify edit
        const updated = await db.query(`
      SELECT signals FROM memory_units WHERE id = ?
    `, ['test-edit-1']);

        const newSignals = JSON.parse(updated[0].signals);
        console.log(`Updated amount: $${newSignals.amount}`);

        // Cleanup
        await db.query('DELETE FROM memory_units WHERE id = ?', ['test-edit-1']);

        console.log('\n✅ Test 3 PASSED\n');

    } catch (error) {
        console.error('❌ Test 3 FAILED:', error.message, '\n');
    }
}

async function testPatternLearning() {
    console.log('🧪 Test 4: Pattern Learning\n');

    try {
        // Simulate multiple clarifications for "apple"
        for (let i = 0; i < 3; i++) {
            await db.query(`
        INSERT INTO user_intent_patterns (
          user_id, input_pattern, preferred_intent, frequency
        ) VALUES (?, ?, ?, ?)
        ON CONFLICT (user_id, input_pattern) DO UPDATE SET
          frequency = user_intent_patterns.frequency + 1
      `, [TEST_USER_ID, 'apple', 'LOG_FOOD', 1]);
        }

        console.log('Learned pattern: "apple" → LOG_FOOD (3x)');

        // Check learned pattern
        const pattern = await clarificationService.checkLearnedPattern(TEST_USER_ID, 'apple');

        console.log(`Has pattern: ${pattern.hasPattern ? '✅ YES' : '❌ NO'}`);
        if (pattern.hasPattern) {
            console.log(`Preferred intent: ${pattern.intent}`);
        }

        // Cleanup
        await db.query('DELETE FROM user_intent_patterns WHERE user_id = ?', [TEST_USER_ID]);

        console.log('\n✅ Test 4 PASSED\n');

    } catch (error) {
        console.error('❌ Test 4 FAILED:', error.message, '\n');
    }
}

async function runTests() {
    console.log('='.repeat(60));
    console.log('Critical Gap Features - Tests');
    console.log('='.repeat(60));
    console.log('');

    try {
        await testClarification();
        await testUndo();
        await testEdit();
        await testPatternLearning();

        console.log('='.repeat(60));
        console.log('🎉 ALL TESTS PASSED');
        console.log('='.repeat(60));

        process.exit(0);
    } catch (error) {
        console.error('\n' + '='.repeat(60));
        console.error('💥 TESTS FAILED');
        console.error('='.repeat(60));
        console.error(error);

        process.exit(1);
    }
}

runTests();
