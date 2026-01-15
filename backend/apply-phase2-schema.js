// Apply Phase 2 Schema to Supabase
// Run: node apply-phase2-schema.js

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function applyPhase2Schema() {
    try {
        console.log('📦 Applying Phase 2 Schema to Supabase...\n');

        // Test connection
        const testResult = await pool.query('SELECT NOW()');
        console.log('✅ Database connected:', testResult.rows[0].now);
        console.log('');

        // Read schema file
        const schemaPath = path.join(__dirname, 'src', 'db', 'phase2-schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        console.log('📄 Schema file loaded\n');

        // Apply schema
        console.log('🔨 Creating Phase 2 tables...\n');
        await pool.query(schema);

        console.log('✅ Phase 2 schema applied successfully!\n');

        // Verify tables
        const tables = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
        AND tablename IN ('metrics', 'habits', 'habit_completions', 'user_engagement', 'nudge_campaigns', 'correlations')
      ORDER BY tablename
    `);

        console.log('✅ Created tables:');
        tables.rows.forEach(row => {
            console.log(`   ✓ ${row.tablename}`);
        });

        console.log('\n📊 Checking triggers...');
        const triggers = await pool.query(`
      SELECT trigger_name, event_object_table
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
        AND trigger_name IN ('trigger_update_engagement', 'trigger_update_habit_stats')
    `);

        console.log('\n✅ Created triggers:');
        triggers.rows.forEach(row => {
            console.log(`   ✓ ${row.trigger_name} on ${row.event_object_table}`);
        });

        console.log('\n🎉 Phase 2 schema ready!\n');

    } catch (error) {
        console.error('❌ Error applying schema:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

applyPhase2Schema();
