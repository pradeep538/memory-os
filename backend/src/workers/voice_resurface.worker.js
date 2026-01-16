
import feedService from '../services/engagement/feedService.js';
import { query } from '../db/index.js';

export const QUEUE_NAME = 'voice-resurface';
export const SCHEDULE = '0 9 * * 1'; // Every Monday at 9 AM

export default async function (job) {
    console.log('🎙️ Generating Weekly Voice Resurfaces...');

    try {
        // 1. Get Active Users
        const { rows: users } = await query('SELECT id FROM users');

        for (const user of users) {
            // 2. Find a voice memory from the past (e.g. > 7 days ago)
            const memorySql = `
                SELECT id, created_at FROM memory_units
                WHERE user_id = $1 AND source = 'voice'
                AND created_at < NOW() - INTERVAL '7 days'
                ORDER BY RANDOM()
                LIMIT 1
            `;
            const { rows: memories } = await query(memorySql, [user.id]);

            if (memories.length > 0) {
                const memory = memories[0];
                const dateStr = new Date(memory.created_at).toLocaleDateString();

                await feedService.createItem(user.id, {
                    type: 'voice_replay',
                    title: 'Your Voice, Rewind',
                    body: `Listen to what you recorded on ${dateStr}.`,
                    data: { memoryId: memory.id, type: 'voice_replay' },
                    expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days
                });
            }
        }
        console.log(`✅ Voice resurfaced for users.`);

    } catch (err) {
        console.error('❌ Voice Resurface Failed:', err);
        throw err;
    }
}
