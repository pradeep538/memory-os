
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config({ path: '/Users/geetag/Documents/memory-os/backend/.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function addUpdatedAt() {
    try {
        console.log('🔧 Adding updated_at column to memory_units...');

        await pool.query(`
            ALTER TABLE memory_units 
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        `);

        // Optional: Create trigger to auto-update updated_at (good practice)
        await pool.query(`
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = NOW();
                RETURN NEW;
            END;
            $$ language 'plpgsql';
        `);

        await pool.query(`
            DROP TRIGGER IF EXISTS update_memory_units_updated_at ON memory_units;
            CREATE TRIGGER update_memory_units_updated_at
            BEFORE UPDATE ON memory_units
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        `);

        console.log('✅ Column updated_at added successfully!');

    } catch (err) {
        console.error('❌ Error adding column:', err);
    } finally {
        await pool.end();
    }
}

addUpdatedAt();
