#!/usr/bin/env node

/**
 * Run all migrations for intent architecture
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function runCommand(command, description) {
    console.log(`\n📝 ${description}...`);
    try {
        execSync(command, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
        console.log(`✅ ${description} complete`);
    } catch (error) {
        console.error(`❌ ${description} failed`);
        throw error;
    }
}

async function run() {
    console.log('='.repeat(70));
    console.log('Intent Architecture - Full Setup');
    console.log('='.repeat(70));
    console.log('');
    console.log('This will:');
    console.log('  1. Run schema migration (009_intent_architecture.sql)');
    console.log('  2. Seed intent registry (7 core intents)');
    console.log('  3. Seed signal definitions (7 core signals)');
    console.log('  4. Migrate existing data (category → intent+signals)');
    console.log('  5. Run verification tests');
    console.log('');

    try {
        // 1. Run schema migration
        runCommand(
            'psql $DATABASE_URL -f src/db/migrations/009_intent_architecture.sql',
            'Step 1/5: Schema migration'
        );

        // 2. Seed intents
        runCommand(
            'node scripts/seed_intents.js',
            'Step 2/5: Seed intent registry'
        );

        // 3. Migrate data
        runCommand(
            'node scripts/migrate_to_intents.js',
            'Step 3/5: Migrate existing data'
        );

        // 4. Run tests
        runCommand(
            'node scripts/test_intent_architecture.js',
            'Step 4/5: Verification tests'
        );

        console.log('\n' + '='.repeat(70));
        console.log('🎉 INTENT ARCHITECTURE SETUP COMPLETE');
        console.log('='.repeat(70));
        console.log('');
        console.log('Next steps:');
        console.log('  1. Integrate hybrid extractor into input controller');
        console.log('  2. Update analytics queries to use intent/signals');
        console.log('  3. Test end-to-end with new domains (Spanish, cooking, etc.)');
        console.log('');

        process.exit(0);
    } catch (error) {
        console.error('\n' + '='.repeat(70));
        console.error('💥 SETUP FAILED');
        console.error('='.repeat(70));
        console.error(error);

        process.exit(1);
    }
}

run();
