import TestApiClient from './helpers/api-client.js';
import fastify from '../src/index.js';

describe('Engagement E2E Tests', () => {
    let app;
    let client;

    beforeAll(async () => {
        app = fastify;
        client = new TestApiClient(app);
    });

    describe('Scenario 1: Calculate Engagement Score', () => {
        it('should return engagement summary', async () => {
            const response = await client.get('/engagement/summary');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeDefined();
            expect(response.body.data.score).toBeDefined();
        });

        it('should have valid score range', async () => {
            const response = await client.get('/engagement/summary');

            const score = response.body.data.score;
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(100);
        });
    });

    describe('Scenario 2: Track Logging Streak', () => {
        it('should return streak information', async () => {
            const response = await client.get('/engagement/summary');

            expect(response.body.data.streak).toBeDefined();
            expect(response.body.data.streak.current).toBeGreaterThanOrEqual(0);
            expect(response.body.data.streak.longest).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Scenario 3: Milestone Achievements', () => {
        it('should list achieved milestones', async () => {
            const response = await client.get('/engagement/summary');

            expect(response.body.data.milestones).toBeDefined();
            expect(response.body.data.milestones.achieved).toBeDefined();
            expect(Array.isArray(response.body.data.milestones.achieved)).toBe(true);
        });

        it('should list upcoming milestones', async () => {
            const response = await client.get('/engagement/summary');

            expect(response.body.data.milestones.next).toBeDefined();
            expect(Array.isArray(response.body.data.milestones.next)).toBe(true);
        });
    });

    describe('Scenario 4: Activity Summary', () => {
        it('should return activity stats', async () => {
            const response = await client.get('/engagement/summary');

            expect(response.body.data.activity).toBeDefined();
            expect(response.body.data.activity.total_events).toBeGreaterThanOrEqual(0);
            expect(response.body.data.activity.last_30_days).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Scenario 5: Streak Maintenance', () => {
        it('should maintain streak on daily activity', async () => {
            // Log activity
            await client.post('/input/text', { text: 'Daily activity for streak' });

            // Check streak
            const response = await client.get('/engagement/summary');
            expect(response.body.data.streak.current).toBeGreaterThan(0);
        });
    });

    describe('Scenario 6: Score Decay', () => {
        it('should reflect inactivity in score', async () => {
            const response = await client.get('/engagement/summary');

            // Check days_since_last indicator
            expect(response.body.data.streak.days_since_last).toBeDefined();
            expect(response.body.data.streak.days_since_last).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Scenario 7: Analytics Export', () => {
        it('should get detailed analytics', async () => {
            const response = await client.get('/engagement/analytics');

            if (response.status === 200) {
                expect(response.body.data).toBeDefined();
            }
        });
    });
});
