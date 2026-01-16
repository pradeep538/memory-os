import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function removeDuplicates() {
    const client = await pool.connect();
    try {
        console.log('🧹 Removing duplicate habits...');

        // Find user by email
        const userRes = await client.query(`SELECT id FROM users WHERE email = 'geetamg538@gmail.com'`);
        if (userRes.rowCount === 0) {
            console.log('User not found.');
            return;
        }
        const userId = userRes.rows[0].id;
        console.log(`Found user ID: ${userId}`);

        // Find duplicates
        const duplicatesQuery = `
      SELECT array_agg(id) as ids, habit_name
      FROM habits
      WHERE user_id = $1
      GROUP BY habit_name
      HAVING count(*) > 1;
    `;

        const duplicatesRes = await client.query(duplicatesQuery, [userId]);

        for (const row of duplicatesRes.rows) {
            const ids = row.ids;
            const keepId = ids[0]; // Keep the first one found (arbitrary, or could sort by Created At)
            const deleteIds = ids.slice(1);

            console.log(`Found duplicate for '${row.habit_name}': keeping ${keepId}, deleting ${deleteIds.join(', ')}`);

            for (const delId of deleteIds) {
                // Delete dependent completions first if any (though usually cascade handles it, let's be safe if no cascade)
                await client.query('DELETE FROM habit_completions WHERE habit_id = $1', [delId]);
                await client.query('DELETE FROM habits WHERE id = $1', [delId]);
            }
        }

        console.log('✅ Duplicates removed.');
    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

removeDuplicates();
