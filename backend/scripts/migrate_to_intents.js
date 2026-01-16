#!/usr/bin/env node

/**
 * Migrate existing data to intent-based architecture
 * Backward compatible: keeps category data
 */

import { db } from '../src/db/index.js';

const CATEGORY_TO_INTENT_MAP = {
    medication: 'TRACK_MEDICATION',
    finance: 'TRACK_EXPENSE',
    fitness: 'BUILD_HABIT',
    mindfulness: 'BUILD_HABIT',
    health: 'LOG_HEALTH',
    routine: 'TRACK_ROUTINE',
    generic: 'GENERAL_LOG'
};

async function migrateData() {
    console.log('📝 Migrating existing data to intent architecture...\n');

    try {
        // Count total records to migrate
        const totalResult = await db.query(`
      SELECT COUNT(*) as total
      FROM memory_units
      WHERE intent IS NULL
    `);

        const total = totalResult[0].total;
        console.log(`Found ${total} records to migrate\n`);

        if (total === 0) {
            console.log('✅ No records to migrate\n');
            return;
        }

        // Migrate in batches by category
        for (const [category, intent] of Object.entries(CATEGORY_TO_INTENT_MAP)) {
            const categoryRecords = await db.query(`
        SELECT COUNT(*) as count
        FROM memory_units
        WHERE category = ? AND intent IS NULL
      `, [category]);

            const count = categoryRecords[0].count;

            if (count === 0) continue;

            console.log(`Migrating ${count} "${category}" records to "${intent}"...`);

            // Update records with intent and extract signals from normalized_data
            await db.query(`
        UPDATE memory_units
        SET 
          intent = ?,
          signals = CASE category
            WHEN 'medication' THEN 
              json_object('medication', normalized_data->>'medication')
            WHEN 'finance' THEN
              json_object(
                'amount', CAST(normalized_data->>'amount' AS REAL),
                'description', normalized_data->>'description'
              )
            WHEN 'fitness' THEN
              json_object(
                'activity', normalized_data->>'activity',
                'duration', normalized_data->>'duration'
              )
            WHEN 'mindfulness' THEN
              json_object('activity', normalized_data->>'activity')
            WHEN 'health' THEN
              normalized_data
            WHEN 'routine' THEN
              normalized_data
            ELSE '{}'
          END,
          extraction_method = 'migrated'
        WHERE category = ? AND intent IS NULL
      `, [intent, category]);

            console.log(`  ✓ Migrated ${count} records\n`);
        }

        console.log('✅ Migration complete\n');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    }
}

async function verifyMigration() {
    console.log('🔍 Verifying migration...\n');

    try {
        // Check migration coverage
        const stats = await db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(intent) as with_intent,
        COUNT(category) as with_category
      FROM memory_units
    `);

        const { total, with_intent, with_category } = stats[0];
        const coverage = Math.round((with_intent / total) * 100);

        console.log(`Total records: ${total}`);
        console.log(`With intent: ${with_intent} (${coverage}%)`);
        console.log(`With category: ${with_category}`);
        console.log('');

        // Show intent breakdown
        const breakdown = await db.query(`
      SELECT intent, COUNT(*) as count
      FROM memory_units
      WHERE intent IS NOT NULL
      GROUP BY intent
      ORDER BY count DESC
    `);

        console.log('Intent breakdown:');
        breakdown.forEach(row => {
            console.log(`  ${row.intent}: ${row.count}`);
        });
        console.log('');

        // Check backward compatibility view
        const viewCheck = await db.query(`
      SELECT COUNT(*) as count
      FROM activity_log
    `);

        console.log(`Backward compat view: ${viewCheck[0].count} records accessible`);
        console.log('');

        console.log('✅ Verification complete\n');

    } catch (error) {
        console.error('❌ Verification failed:', error.message);
    }
}

async function run() {
    console.log('='.repeat(60));
    console.log('Data Migration: Categories → Intents');
    console.log('='.repeat(60));
    console.log('');

    try {
        await migrateData();
        await verifyMigration();

        console.log('='.repeat(60));
        console.log('🎉 MIGRATION COMPLETE');
        console.log('='.repeat(60));

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

run();
