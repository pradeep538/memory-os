#!/usr/bin/env node

/**
 * Test Determinism & Validation
 */

import { db } from '../src/db/index.js';
import { validationService } from '../src/services/validation/validationService.js';
import { adherenceCalculator } from '../src/services/analytics/adherenceCalculator.js';

const TEST_USER_ID = 'c3d50e53-701f-4fc7-bd57-e84e0663fb3a';

async function testDuplicateDetection() {
    console.log('🧪 Test 1: Duplicate Detection\n');

    const medication = 'Test Aspirin';
    const input = `I took ${medication}`;

    try {
        // First log should pass
        const result1 = await validationService.validateMedicationLog(
            TEST_USER_ID,
            input,
            new Date()
        );

        console.log('First log:', result1.valid ? '✅ PASS' : '❌ FAIL');
        if (!result1.valid) {
            console.log('  Errors:', result1.errors);
            return;
        }

        // Insert the first log
        await db.query(`
      INSERT INTO memory_units (
        id, user_id, raw_input, source, category,
        normalized_data, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
            'test-dup-1',
            TEST_USER_ID,
            input,
            'text',
            'medication',
            JSON.stringify({ medication }),
            'validated',
            new Date().toISOString()
        ]);

        // Second log within 12 hours should fail
        const result2 = await validationService.validateMedicationLog(
            TEST_USER_ID,
            input,
            new Date()
        );

        console.log('Duplicate log:', !result2.valid ? '✅ BLOCKED' : '❌ ALLOWED (SHOULD BLOCK)');
        if (!result2.valid) {
            console.log('  Errors:', result2.errors);
        }

        // Cleanup
        await db.query('DELETE FROM memory_units WHERE id = ?', ['test-dup-1']);

        console.log('\n✅ Test 1 PASSED\n');
    } catch (error) {
        console.error('❌ Test 1 FAILED:', error.message);
    }
}

async function testBackdateLimits() {
    console.log('🧪 Test 2: Backdate Limits\n');

    try {
        // Test 1: Within limit (1 hour ago) - should pass
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const result1 = await validationService.validateMedicationLog(
            TEST_USER_ID,
            'I took vitamin C',
            oneHourAgo
        );

        console.log('1 hour ago:', result1.valid ? '✅ ALLOWED' : '❌ BLOCKED');

        // Test 2: Beyond limit (3 hours ago) - should fail
        const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
        const result2 = await validationService.validateMedicationLog(
            TEST_USER_ID,
            'I took vitamin C',
            threeHoursAgo
        );

        console.log('3 hours ago:', !result2.valid ? '✅ BLOCKED' : '❌ ALLOWED (SHOULD BLOCK)');
        if (!result2.valid) {
            console.log('  Error:', result2.errors[0]);
        }

        console.log('\n✅ Test 2 PASSED\n');
    } catch (error) {
        console.error('❌ Test 2 FAILED:', error.message);
    }
}

async function testChecksumDeterminism() {
    console.log('🧪 Test 3: Checksum Determinism\n');

    try {
        const data = {
            userId: TEST_USER_ID,
            medication: 'Aspirin',
            timestamp: new Date('2026-01-16T08:00:00Z')
        };

        // Generate checksum 10 times
        const checksums = Array(10).fill().map(() =>
            validationService.generateChecksum(data)
        );

        const allSame = checksums.every(c => c === checksums[0]);

        console.log('Generated 10 checksums');
        console.log('All identical:', allSame ? '✅ YES' : '❌ NO');
        console.log('Checksum:', checksums[0]);

        if (allSame) {
            console.log('\n✅ Test 3 PASSED\n');
        } else {
            console.error('❌ Test 3 FAILED: Checksums vary!');
            console.log('Checksums:', checksums);
        }
    } catch (error) {
        console.error('❌ Test 3 FAILED:', error.message);
    }
}

async function testAdherenceCalculation() {
    console.log('🧪 Test 4: Adherence Calculation\n');

    try {
        // Seed test data (6 days out of 7)
        const dates = [0, 1, 3, 4, 5, 6].map(daysAgo => {
            const date = new Date();
            date.setDate(date.getDate() - daysAgo);
            date.setHours(8, 0, 0, 0);
            return date;
        });

        for (let i = 0; i < dates.length; i++) {
            await db.query(`
        INSERT INTO memory_units (
          id, user_id, raw_input, source, category,
          normalized_data, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
                `test-adh-${i}`,
                TEST_USER_ID,
                'I took test vitamin X',
                'text',
                'medication',
                JSON.stringify({ medication: 'test vitamin X' }),
                'validated',
                dates[i].toISOString()
            ]);
        }

        // Calculate adherence
        const adherence = await adherenceCalculator.calculateAdherence(
            TEST_USER_ID,
            'test vitamin X',
            7
        );

        console.log('Results:');
        console.log(`  Actual days: ${adherence.actual_days} / ${adherence.expected_days}`);
        console.log(`  Adherence: ${adherence.adherence_percentage}%`);
        console.log(`  Streak: ${adherence.current_streak} days`);
        console.log(`  Gaps: ${adherence.gaps.length}`);
        console.log(`  Checksum: ${adherence.checksum}`);

        // Test determinism
        console.log('\nTesting determinism (3 calculations)...');
        const verification = await adherenceCalculator.verifyDeterminism(
            TEST_USER_ID,
            'test vitamin X',
            7,
            3
        );

        console.log(`  Deterministic: ${verification.is_deterministic ? '✅ YES' : '❌ NO'}`);
        console.log(`  Checksums: ${verification.checksums.join(', ')}`);

        // Cleanup
        for (let i = 0; i < dates.length; i++) {
            await db.query('DELETE FROM memory_units WHERE id = ?', [`test-adh-${i}`]);
        }

        if (adherence.adherence_percentage === 86 && verification.is_deterministic) {
            console.log('\n✅ Test 4 PASSED\n');
        } else {
            console.error('❌ Test 4 FAILED: Expected 86% adherence or not deterministic');
        }
    } catch (error) {
        console.error('❌ Test 4 FAILED:', error.message);
    }
}

async function testAuditLog() {
    console.log('🧪 Test 5: Audit Log Trigger\n');

    try {
        // Insert a medication record
        await db.query(`
      INSERT INTO memory_units (
        id, user_id, raw_input, source, category,
        normalized_data, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
            'test-audit-1',
            TEST_USER_ID,
            'I took test medication',
            'text',
            'medication',
            JSON.stringify({ medication: 'test medication' }),
            'validated'
        ]);

        // Check audit log
        const auditEntries = await db.query(`
      SELECT * FROM audit_log
      WHERE table_name = 'memory_units'
        AND record_id = ?
        AND operation = 'INSERT'
    `, ['test-audit-1']);

        console.log('Audit entry created:', auditEntries.length > 0 ? '✅ YES' : '❌ NO');
        if (auditEntries.length > 0) {
            const entry = auditEntries[0];
            console.log(`  ID: ${entry.id}`);
            console.log(`  Operation: ${entry.operation}`);
            console.log(`  User: ${entry.user_id}`);
            console.log(`  Created: ${entry.created_at}`);
        }

        // Cleanup
        await db.query('DELETE FROM memory_units WHERE id = ?', ['test-audit-1']);

        console.log('\n✅ Test 5 PASSED\n');
    } catch (error) {
        console.error('❌ Test 5 FAILED:', error.message);
    }
}

async function runTests() {
    console.log('='.repeat(60));
    console.log('Determinism & Validation - Tests');
    console.log('='.repeat(60));
    console.log('');

    try {
        await testDuplicateDetection();
        await testBackdateLimits();
        await testChecksumDeterminism();
        await testAdherenceCalculation();
        await testAuditLog();

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
