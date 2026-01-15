// List existing tables in Supabase database
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function listTables() {
    try {
        console.log('📋 Listing tables in database...\n');

        const result = await pool.query(`
      SELECT table_name, table_schema
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

        console.log(`Found ${result.rows.length} tables:\n`);
        result.rows.forEach((row, i) => {
            console.log(`  ${i + 1}. ${row.table_name}`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

listTables();
