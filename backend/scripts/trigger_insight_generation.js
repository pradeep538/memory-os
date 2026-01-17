
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

import insightsService from '../src/services/intelligence/insightsService.js';
import db from '../src/db/index.js';

const MOCK_PATTERNS = {
    frequency_patterns: [
        {
            pattern_type: 'frequency',
            category: 'fitness',
            activity: 'gym',
            description: 'User goes to gym 3 times a week',
            confidence: 0.85,
            frequency_per_week: 3
        }
    ],
    time_patterns: [
        {
            pattern_type: 'time_of_day',
            category: 'productivity',
            activity: 'reading',
            description: 'User reads mostly in the morning',
            confidence: 0.92,
            peak_hour: 7
        }
    ]
};

async function run() {
    try {
        console.log('🔍 Finding test user...');
        const userRes = await db.query("SELECT id FROM users LIMIT 1");
        if (userRes.rows.length === 0) {
            console.error('❌ No users found.');
            process.exit(1);
        }
        const userId = userRes.rows[0].id;
        console.log(`👤 Using User ID: ${userId}`);

        // Mock the fetchPatternsFromAnalytics method
        insightsService.fetchPatternsFromAnalytics = async () => {
            console.log('🧪 Using MOCK analytics data for testing...');
            return MOCK_PATTERNS;
        };

        console.log('🚀 Triggering Insight Generation...');
        const insights = await insightsService.getUserInsights(userId, true);

        console.log('\n✅ Generation Complete!');
        console.log(`Generated ${insights.length} insights:`);
        insights.forEach(i => {
            console.log(`- [${i.category}] ${i.insight} (Confidence: ${i.confidence})`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit();
    }
}

run();
