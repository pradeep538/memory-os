
import { query } from '../src/db/index.js';
import HabitModel from '../src/models/habit.model.js';

const USER_ID = 'c3d50e53-701f-4fc7-bd57-e84e0663fb3a';

async function runTests() {
    console.log('=== STARTING STREAK LOGIC TESTS ===');

    try {
        // 1. Create a Weekly Habit
        console.log('\n--- Test 1: Weekly Habit (Target 1/week) ---');
        const weeklyHabit = await HabitModel.create(USER_ID, {
            habitName: 'Test Weekly Yoga',
            habitType: 'build',
            targetFrequency: 1,
            targetFrequencyUnit: 'week'
        });
        console.log(`Created Habit: ${weeklyHabit.habit_name} (${weeklyHabit.id})`);

        // Insert completion for TODAY
        console.log('Completing Today...');
        await HabitModel.logCompletion(weeklyHabit.id, USER_ID, true);
        let habit = await HabitModel.findById(weeklyHabit.id);
        console.log(`Streak after Today: ${habit.current_streak} (Expected: 1)`);

        // Insert completion for 4 DAYS AGO (Same week? Or previous?)
        // If today is Friday, 4 days ago is Mon. Same week.
        // If logic is strict "Daily", it will break.

        // Let's force valid completion dates manual insert to manipulate time
        // But updateStreak uses 'getCompletions'.

        // We'll create a NEW Weekly Habit for Multi-Week test?
        // Actually, let's just test GAPS for "Weekly".
        // If I complete Day 1, then Day 4.
        // Daily Logic: Streak 1 (Day 4 reset).
        // Weekly Logic: Streak 1 (Both in same week, count = 2).

        // Let's Simulate:
        // Week 1: Mon (Done)
        // Week 2: Mon (Done)
        // Streak shoud be 2.
        // Gap is 7 days.

        console.log('\n--- Test 2: Weekly Habit (2 Weeks Consecutive) ---');
        const weeklyHabit2 = await HabitModel.create(USER_ID, {
            habitName: 'Test Weekly Run',
            habitType: 'build',
            targetFrequency: 1,
            targetFrequencyUnit: 'week'
        });

        const today = new Date();
        const lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 7);

        // Log Last Week
        await dbLog(weeklyHabit2.id, USER_ID, lastWeek.toISOString().split('T')[0]);
        // Log Today
        await dbLog(weeklyHabit2.id, USER_ID, today.toISOString().split('T')[0]);

        // Manually trigger streak update
        await HabitModel.updateStreak(weeklyHabit2.id);

        habit = await HabitModel.findById(weeklyHabit2.id);
        console.log(`Streak after 2 weeks: ${habit.current_streak}`);
        if (habit.current_streak >= 2) console.log('✅ Passed (Weekly logic works)');
        else console.log('❌ Failed (Weekly logic missing)');

        console.log('\n--- Test 3: Daily -> Weekly Conversion ---');
        // Create Daily habit
        const dailyHabit = await HabitModel.create(USER_ID, {
            habitName: 'Test Conversion',
            habitType: 'build',
            targetFrequency: 1,
            targetFrequencyUnit: 'day'
        });

        // Complete 7 days ago, and Today. (Gap in Daily)
        await dbLog(dailyHabit.id, USER_ID, lastWeek.toISOString().split('T')[0]);
        await dbLog(dailyHabit.id, USER_ID, today.toISOString().split('T')[0]);

        await HabitModel.updateStreak(dailyHabit.id);
        let dHabit = await HabitModel.findById(dailyHabit.id);
        console.log(`Daily Streak (Expect 1): ${dHabit.current_streak}`);

        // Convert to Weekly (1/week)
        console.log('Updating to Weekly ...');
        // We must use HabitService to trigger the logic, not Model directly
        // But script imports Model. Let's import Service or simulate what Service does.
        // Simulating:
        await HabitModel.update(dailyHabit.id, { target_frequency_unit: 'week' });
        await HabitModel.updateStreak(dailyHabit.id);

        dHabit = await HabitModel.findById(dailyHabit.id);
        console.log(`Weekly Streak (Expect 2): ${dHabit.current_streak}`);

        if (dHabit.current_streak >= 2) console.log('✅ Passed (Conversion logic verified)');
        else console.log('❌ Failed (Conversion logic failed)');

        // Clean up
        await HabitModel.delete(weeklyHabit.id);
        await HabitModel.delete(weeklyHabit2.id);
        await HabitModel.delete(dailyHabit.id);

    } catch (err) {
        console.error('Test Failed:', err);
    } finally {
        process.exit();
    }
}

async function dbLog(habitId, userId, date) {
    const q = `INSERT INTO habit_completions (habit_id, user_id, completion_date, completed) 
               VALUES ($1, $2, $3, true) ON CONFLICT DO NOTHING`;
    await query(q, [habitId, userId, date]);
}

runTests();
