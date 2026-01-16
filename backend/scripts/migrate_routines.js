#!/usr/bin/env node

/**
 * Run database migration for routine_schedules table
 */

import { db } from '../src/db/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
    console.log('📝 Running routine_schedules migration...\n');

    try {
        const migrationSQL = fs.readFileSync(
            path.join(__dirname, '../src/db/migrations/007_routine_schedules.sql'),
            'utf8'
        );

        await db.query(migrationSQL);

        console.log('✅ Migration completed successfully\n');
        console.log('Created table: routine_schedules');
        console.log('Created indexes: idx_routine_schedules_user_id, idx_routine_schedules_enabled');

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

migrate();
