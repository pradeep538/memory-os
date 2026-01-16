
import feedService from '../services/engagement/feedService.js';
import { query } from '../db/index.js';

export const QUEUE_NAME = 'daily-summary';
export const SCHEDULE = '0 8 * * *'; // Every day at 8 AM

export default async function (job) {
    console.log('🌞 Generating Daily Summaries...');

    try {
        // 1. Get Active Users (Mockup: Get all users for now, or users active in last 7 days)
        const activeUsersSql = `SELECT id FROM users`;
        // Real implementation would filter by last_activity_date
        const { rows: users } = await query(activeUsersSql);

        for (const user of users) {
            // 2. Generate Summary Feed Item
            await feedService.createItem(user.id, {
                type: 'reflection',
                title: 'Daily Check-In',
                body: 'Good morning! Ready to capture your thoughts today?',
                data: {},
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Expires in 24h
            });
        }
        console.log(`✅ Generated daily summaries for ${users.length} users.`);

    } catch (err) {
        console.error('❌ Daily Summary Failed:', err);
        throw err;
    }
}
