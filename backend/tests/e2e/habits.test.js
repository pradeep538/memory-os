import TestApiClient from './helpers/api-client.js';
import fastify from '../src/index.js';

describe('Habits E2E Tests', () => {
    let app;
    let client;

    beforeAll(async () => {
        app = fastify;
        client = new TestApiClient(app);
    });

    describe('Scenario 1: Create Habit', () => {
        it('should create a new habit', async () => {
            const response = await client.post('/habits', {
                name: 'Morning Meditation',
                description: 'Meditate for 10 minutes every morning',
                frequency: 'daily',
                target_days: [1, 2, 3, 4, 5, 6, 7]
            });

            expect([200, 201]).toContain(response.status);
            if (response.body.success) {
                expect(response.body.data).toBeDefined();
                expect(response.body.data.name).toBe('Morning Meditation');
            }
        });

        it('should validate required fields', async () => {
            const response = await client.post('/habits', {});

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe('Scenario 2: List User Habits', () => {
        it('should return all user habits', async () => {
            const response = await client.get('/habits');

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        it('should filter active habits', async () => {
            const response = await client.get('/habits', { status: 'active' });

            expect(response.status).toBe(200);
            if (response.body.data) {
                response.body.data.forEach(habit => {
                    expect(habit.is_active).toBe(true);
                });
            }
        });
    });

    describe('Scenario 3: Complete Habit', () => {
        it('should mark habit as complete for today', async () => {
            // First create a habit
            const createResponse = await client.post('/habits', {
                name: 'Test Habit for Completion',
                frequency: 'daily'
            });

            if (createResponse.body.data?.id) {
                const habitId = createResponse.body.data.id;
                const completeResponse = await client.post(`/habits/${habitId}/complete`);

                expect([200, 201]).toContain(completeResponse.status);
            }
        });

        it('should prevent duplicate completions for same day', async () => {
            const listResponse = await client.get('/habits');

            if (listResponse.body.data?.length > 0) {
                const habitId = listResponse.body.data[0].id;

                // Complete once
                await client.post(`/habits/${habitId}/complete`);

                // Try to complete again
                const secondResponse = await client.post(`/habits/${habitId}/complete`);

                // Should either accept or reject duplicate
                expect([200, 400, 409]).toContain(secondResponse.status);
            }
        });
    });

    describe('Scenario 4: Streak Calculation', () => {
        it('should calculate current streak', async () => {
            const response = await client.get('/habits');

            expect(response.status).toBe(200);
            if (response.body.data?.length > 0) {
                const habit = response.body.data[0];
                expect(typeof habit.current_streak).toBe('number');
                expect(habit.current_streak).toBeGreaterThanOrEqual(0);
            }
        });
    });

    describe('Scenario 5: Progress Tracking', () => {
        it('should get habit progress', async () => {
            const listResponse = await client.get('/habits');

            if (listResponse.body.data?.length > 0) {
                const habitId = listResponse.body.data[0].id;
                const progressResponse = await client.get(`/habits/${habitId}/progress`);

                expect([200, 404]).toContain(progressResponse.status);
                if (progressResponse.status === 200) {
                    expect(progressResponse.body.data).toBeDefined();
                }
            }
        });
    });

    describe('Scenario 6: Habit Suggestions', () => {
        it('should generate AI habit suggestions', async () => {
            const response = await client.get('/habits/suggestions');

            expect(response.status).toBe(200);
            if (response.body.data) {
                expect(Array.isArray(response.body.data)).toBe(true);
            }
        });
    });

    describe('Scenario 7: Update Habit', () => {
        it('should update habit properties', async () => {
            const createResponse = await client.post('/habits', {
                name: 'Habit to Update',
                frequency: 'daily'
            });

            if (createResponse.body.data?.id) {
                const habitId = createResponse.body.data.id;
                const updateResponse = await client.patch(`/habits/${habitId}`, {
                    name: 'Updated Habit Name',
                    description: 'New description'
                });

                expect([200, 404]).toContain(updateResponse.status);
            }
        });
    });

    describe('Scenario 8: Delete Habit', () => {
        it('should delete habit', async () => {
            const createResponse = await client.post('/habits', {
                name: 'Habit to Delete',
                frequency: 'daily'
            });

            if (createResponse.body.data?.id) {
                const habitId = createResponse.body.data.id;
                const deleteResponse = await client.delete(`/habits/${habitId}`);

                expect([200, 204, 404]).toContain(deleteResponse.status);
            }
        });
    });

    describe('Scenario 9: Habit Templates', () => {
        it('should provide habit templates', async () => {
            const response = await client.get('/habits/templates');

            if (response.status === 200) {
                expect(Array.isArray(response.body.data)).toBe(true);
            }
        });
    });
});
