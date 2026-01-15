// Apply Memory OS schema (skip existing tables)
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function applySchema() {
    try {
        console.log('📊 Applying Memory OS schema...\n');

        // Connect
        await pool.query('SELECT NOW()');
        console.log('✅ Database connected!\n');

        // Create tables one by one (skip if exists)
        const tables = [
            {
                name: 'memory_units',
                sql: `CREATE TABLE IF NOT EXISTS memory_units (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          raw_input TEXT NOT NULL,
          event_type VARCHAR(50),
          category VARCHAR(50),
          normalized_data JSONB,
          confidence_score DECIMAL(3,2),
          source VARCHAR(50),
          status VARCHAR(20) DEFAULT 'tentative',
          corrected_from UUID REFERENCES memory_units(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
            },
            {
                name: 'entities',
                sql: `CREATE TABLE IF NOT EXISTS entities (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          memory_id UUID REFERENCES memory_units(id) ON DELETE CASCADE,
          entity_type VARCHAR(50),
          entity_value TEXT,
          metadata JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
            },
            {
                name: 'patterns',
                sql: `CREATE TABLE IF NOT EXISTS patterns (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          pattern_type VARCHAR(50),
          category VARCHAR(50),
          description TEXT,
          confidence_score DECIMAL(3,2),
          metadata JSONB,
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
            },
            {
                name: 'sessions',
                sql: `CREATE TABLE IF NOT EXISTS sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          session_type VARCHAR(50),
          category VARCHAR(50),
          duration_minutes INT,
          completed BOOLEAN DEFAULT false,
          metadata JSONB,
          started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          completed_at TIMESTAMP
        )`
            },
            {
                name: 'notifications',
                sql: `CREATE TABLE IF NOT EXISTS notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          notification_type VARCHAR(50),
          title TEXT,
          body TEXT,
          metadata JSONB,
          read BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
            },
            {
                name: 'usage_tracking',
                sql: `CREATE TABLE IF NOT EXISTS usage_tracking (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          action_type VARCHAR(50),
          count INT DEFAULT 1,
          date DATE DEFAULT CURRENT_DATE,
          metadata JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
            }
        ];

        console.log('Creating tables...\n');
        for (const table of tables) {
            await pool.query(table.sql);
            console.log(`  ✓ ${table.name}`);
        }

        console.log('\n✅ Memory OS tables ready!');
        console.log('\nNote: Using existing \'users\' and \'plans\' tables from your project\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.code) console.error('Code:', error.code);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

applySchema();
