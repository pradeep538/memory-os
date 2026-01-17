import habitService from '../src/services/habits/habitService.js';
import inputEnhancementService from '../src/services/input/inputEnhancementService.js';
import { query } from '../src/db/index.js';
import dotenv from 'dotenv';

dotenv.config();

async function verifyHabits() {
    console.log('🧪 Verifying Habit Logic...');

    const TEST_USER_ID = 'c3d50e53-701f-4fc7-bd57-e84e0663fb3a'; // geetamg538
    const TEST_HABIT_NAME = 'Test Hydration';

    try {
        // 1. Cleanup
        console.log('\n🧹 Cleaning up test habit...');
        await query('DELETE FROM habits WHERE user_id = $1 AND habit_name = $2', [TEST_USER_ID, TEST_HABIT_NAME]);

        // 2. Create Habit
        console.log('\n🌱 Creating test habit...');
        const newHabit = await habitService.createHabit(TEST_USER_ID, {
            habit_name: TEST_HABIT_NAME,
            habit_type: 'build',
            target_frequency: 1,
            target_frequency_unit: 'day'
        });
        console.log(`   ✅ Created Habit: ${newHabit.id} - ${newHabit.habit_name}`);

        // 3. Verify Initial State
        if (newHabit.current_streak !== 0 || newHabit.completion_rate !== 0) {
            throw new Error('Initial streak/rate should be 0');
        }

        // 4. Simulate Input Matching
        const input = "drank some water";
        console.log(`\n🗣️ Simulating input: "${input}"`);

        // Check intent directly to test matching logic
        const matched = await habitService.checkCompletionIntent(TEST_USER_ID, input);
        console.log('   Match Result:', matched ? matched.habit_name : 'No match');

        // Note: Actual matching depends on embeddings/LLM. 
        // If this fails, we might need to manually trigger completion to test STREAK logic specifically.

        // 5. Manual Completion Trigger (Testing Streak Logic)
        console.log('\n✅ Triggering completion manually to test streak logic...');
        const updatedHabit = await habitService.logCompletion(newHabit.id, TEST_USER_ID, true, input);

        console.log(`   Current Streak: ${updatedHabit.current_streak}`);
        console.log(`   Completion Rate: ${updatedHabit.completion_rate}`);

        if (updatedHabit.current_streak === 1) {
            console.log('   ✅ Streak correctly incremented to 1');
        } else {
            console.error('   ❌ Streak detection failed!');
        }

    } catch (err) {
        console.error('❌ Verification Failed:', err);
    } finally {
        process.exit(0);
    }
}

verifyHabits();
