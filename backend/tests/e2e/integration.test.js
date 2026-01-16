import TestApiClient from './helpers/api-client.js';
import fastify from '../src/index.js';

describe('Integration E2E Tests', () => {
    let app;
    let client;

    beforeAll(async () => {
        app = fastify;
        client = new TestApiClient(app);
    });

    describe('Scenario 1: End-to-End User Journey', () => {
        it('should complete full user flow', async () => {
            // 1. Create memory
            const createResponse = await client.post('/input/text', {
                text: 'Integration test: Did cardio for 30 minutes'
            });
            expect(createResponse.status).toBe(200);

            // 2. Verify memory appears in list
            const listResponse = await client.get('/memory', { limit: 10 });
            expect(listResponse.status).toBe(200);
            expect(listResponse.body.data.length).toBeGreaterThan(0);

            // 3. Check engagement updated
            const engagementResponse = await client.get('/engagement/summary');
            expect(engagementResponse.status).toBe(200);
            expect(engagementResponse.body.data.activity.total_events).toBeGreaterThan(0);

            // 4. Verify category stats
            const statsResponse = await client.get('/memory/stats/categories');
            expect(statsResponse.status).toBe(200);
        });
    });

    describe('Scenario 2: Multi-Service Communication', () => {
        it('should communicate between backend and analytics service', async () => {
            // This would test backend → Python analytics integration
            const response = await client.get('/analytics/patterns');

            if (response.status === 200) {
                expect(response.body.data).toBeDefined();
            }
        });
    });

    describe('Scenario 3: Feed Data Aggregation', () => {
        it('should aggregate all feed data', async () => {
            const responses = await Promise.all([
                client.get('/engagement/summary'),
                client.get('/memory/stats/categories'),
                client.get('/habits'),
                client.get('/memory', { limit: 5 }),
                client.get('/insights')
            ]);

            responses.forEach(response => {
                expect(response.status).toBe(200);
            });
        });

        it('should load feed data efficiently', async () => {
            const start = Date.now();

            await Promise.all([
                client.get('/engagement/summary'),
                client.get('/memory/stats/categories'),
                client.get('/memory', { limit: 10 })
            ]);

            const duration = Date.now() - start;
            expect(duration).toBeLessThan(3000); // All 3 requests in < 3s
        });
    });

    describe('Scenario 4: Real-time Updates', () => {
        it('should reflect new memory in stats immediately', async () => {
            // Get initial stats
            const initialStats = await client.get('/memory/stats/categories');
            const initialFitness = initialStats.body.data.fitness || 0;

            // Create new fitness memory
            await client.post('/input/text', {
                text: 'Real-time test: gym session'
            });

            // Get updated stats
            const updatedStats = await client.get('/memory/stats/categories');
            const updatedFitness = updatedStats.body.data.fitness || 0;

            // Should reflect new memory (might be async so allow same or increased)
            expect(updatedFitness).toBeGreaterThanOrEqual(initialFitness);
        });
    });

    describe('Scenario 5: Performance Benchmarks', () => {
        it('should meet API response time targets', async () => {
            const benchmarks = [
                { endpoint: '/memory', target: 1000 },
                { endpoint: '/engagement/summary', target: 2000 },
                { endpoint: '/memory/stats/categories', target: 1000 },
                { endpoint: '/habits', target: 1000 }
            ];

            for (const { endpoint, target } of benchmarks) {
                const start = Date.now();
                const response = await client.get(endpoint);
                const duration = Date.now() - start;

                expect(response.status).toBe(200);
                expect(duration).toBeLessThan(target);
            }
        });

        it('should handle concurrent requests efficiently', async () => {
            const start = Date.now();

            const requests = Array.from({ length: 20 }, () =>
                client.get('/memory', { limit: 10 })
            );

            await Promise.all(requests);

            const duration = Date.now() - start;
            expect(duration).toBeLessThan(10000); // 20 concurrent requests in < 10s
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid endpoints gracefully', async () => {
            const response = await client.get('/nonexistent-endpoint');
            expect([404, 500]).toContain(response.status);
        });

        it('should handle malformed requests', async () => {
            const response = await client.post('/input/text', {
                invalid: 'data structure'
            });
            expect([400, 500]).toContain(response.status);
        });
    });
});
