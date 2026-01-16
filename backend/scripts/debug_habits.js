
import { query } from '../src/db/index.js';

const USER_ID = 'c3d50e53-701f-4fc7-bd57-e84e0663fb3a'; // geetamg538

async function checkHabits() {
    try {
        console.log(`Checking habits for user: ${USER_ID}`);

        // 1. Count all habits (ignoring status)
        const allHabits = await query(
            'SELECT * FROM habits WHERE user_id = $1',
            [USER_ID]
        );

        console.log(`Total habits found: ${allHabits.rows.length}`);

        if (allHabits.rows.length > 0) {
            console.log('Habit Statuses:');
            allHabits.rows.forEach(h => {
                console.log(`- ${h.habit_name} [${h.id}]: ${h.status} (deleted: ${h.deleted_at})`);
            });
        } else {
            console.log('No habits found! Checking total habits in DB...');
            const total = await query('SELECT count(*) FROM habits');
            console.log(`Total habits in entire DB: ${total.rows[0].count}`);

            console.log('Listing 5 random habits to check user_ids:');
            const random = await query('SELECT user_id, habit_name FROM habits LIMIT 5');
            console.table(random.rows);
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

checkHabits();
