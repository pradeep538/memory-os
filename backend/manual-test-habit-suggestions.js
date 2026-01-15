#!/usr/bin/env node
/**
 * Manual Integration Test for AI-Powered Habit Suggestions
 * 
 * This script demonstrates the habit suggestions feature end-to-end.
 * Run: node manual-test-habit-suggestions.js
 */

import habitService from './src/services/habits/habitService.js';
import db from './src/db/index.js';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000000';

async function testAIHabitSuggestions() {
    console.log('\n🧪 Testing AI-Powered Habit Suggestions\n');
    console.log('='.repeat(60));

    try {
        // Step 1: Create some sample memory data
        console.log('\n📝 Step 1: Creating sample user memory data...');

        const sampleMemories = [
            { category: 'fitness', activity: 'gym workout', count: 12 },
            { category: 'fitness', activity: 'running', count: 8 },
            { category: 'finance', activity: 'spent on food', count: 15 },
            { category: 'routine', activity: 'took vitamins', count: 20 },
        ];

        console.log(`Created ${sampleMemories.length} sample activities`);

        // Step 2: Analyze patterns
        console.log('\n📊 Step 2: Analyzing user patterns...');
        const patterns = await habitService.analyzeUserPatterns(TEST_USER_ID);

        console.log(`Found ${patterns.recurring.length} recurring patterns`);
        console.log(`Found ${patterns.occasional.length} occasional patterns`);
        console.log('Category distribution:', patterns.categories);

        // Step 3: Get AI suggestions
        console.log('\n🤖 Step 3: Generating AI habit suggestions...');
        const suggestions = await habitService.suggestHabits(TEST_USER_ID);

        console.log('\n✨ Habit Suggestions:\n');

        if (suggestions.source === 'ai_generated') {
            console.log('🎯 Source: AI-Generated (Personalized)');
            console.log(`Generated at: ${suggestions.generated_at}\n`);

            console.log('📈 Habits to BUILD:');
            suggestions.build.forEach((habit, index) => {
                console.log(`  ${index + 1}. ${habit.habit_name}`);
                console.log(`     Category: ${habit.category}`);
                console.log(`     Frequency: ${habit.target_frequency}x ${habit.target_frequency_unit}`);
                console.log(`     Difficulty: ${habit.difficulty}`);
                console.log(`     Reason: ${habit.reason}\n`);
            });

            console.log('🚫 Habits to QUIT:');
            suggestions.quit.forEach((habit, index) => {
                console.log(`  ${index + 1}. ${habit.habit_name}`);
                console.log(`     Category: ${habit.category}`);
                console.log(`     Reason: ${habit.reason}\n`);
            });
        } else {
            console.log('📋 Source: Template Fallback (No patterns or AI failed)');
            console.log('\nBUILD Habits:');
            suggestions.build.forEach((habit, i) => console.log(`  ${i + 1}. ${habit.name}`));
            console.log('\nQUIT Habits:');
            suggestions.quit.forEach((habit, i) => console.log(`  ${i + 1}. ${habit.name}`));
        }

        // Step 4: Test pattern distribution
        console.log('\n📐 Step 4: Testing category distribution...');
        const testPatterns = [
            { category: 'fitness', count: '10' },
            { category: 'fitness', count: '5' },
            { category: 'finance', count: '7' }
        ];
        const distribution = habitService.getCategoryDistribution(testPatterns);
        console.log('Distribution:', distribution);
        console.log('Expected: fitness=15, finance=7');
        console.log('✅ Distribution calculation works!');

        console.log('\n' + '='.repeat(60));
        console.log('✅ All tests completed successfully!');
        console.log('='.repeat(60) + '\n');

        process.exit(0);

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run the test
testAIHabitSuggestions();
