#!/usr/bin/env node

/**
 * Run audit log migration
 */

import { db } from '../src/db/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
    console.log('📝 Running audit log migration...\n');

    try {
        const migrationSQL = fs.readFileSync(
            path.join(__dirname, '../src/db/migrations/008_audit_log.sql'),
            'utf8'
        );

        await db.query(migrationSQL);

        console.log('✅ Migration completed successfully\n');
        console.log('Created:');
        console.log('  - audit_log table');
        console.log('  - create_audit_entry() trigger function');
        console.log('  - audit_memory_units trigger');
        console.log('  - Indexes: idx_audit_log_record, idx_audit_log_user, idx_audit_log_created');

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

migrate();
