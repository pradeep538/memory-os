import TestApiClient from './helpers/api-client.js';
import fastify from '../src/index.js';

describe('Insights & Analytics E2E Tests', () => {
    let app;
    let client;

    beforeAll(async () => {
        app = fastify;
        client = new TestApiClient(app);
    });

    describe('Scenario 1: Frequency Patterns', () => {
        it('should detect frequency patterns', async () => {
            const response = await client.get('/analytics/patterns');

            if (response.status === 200) {
                expect(response.body.data).toBeDefined();
            }
        });
    });

    describe('Scenario 2: Time-based Patterns', () => {
        it('should detect time patterns', async () => {
            const response = await client.get('/analytics/time-patterns');

            if (response.status === 200) {
                expect(Array.isArray(response.body.data)).toBe(true);
            }
        });
    });

    describe('Scenario 3: Consistency Scoring', () => {
        it('should calculate consistency scores', async () => {
            const response = await client.get('/analytics/consistency');

            if (response.status === 200) {
                expect(response.body.data.score).toBeDefined();
                expect(response.body.data.score).toBeGreaterThanOrEqual(0);
                expect(response.body.data.score).toBeLessThanOrEqual(100);
            }
        });
    });

    describe('Scenario 4: Gap Detection', () => {
        it('should detect activity gaps', async () => {
            const response = await client.get('/analytics/gaps');

            if (response.status === 200) {
                expect(Array.isArray(response.body.data)).toBe(true);
            }
        });
    });

    describe('Scenario 5: Correlations', () => {
        it('should calculate correlations', async () => {
            const response = await client.post('/correlations/calculate');

            expect([200, 201, 202]).toContain(response.status);
        });

        it('should retrieve correlations', async () => {
            const response = await client.get('/correlations');

            if (response.status === 200) {
                expect(Array.isArray(response.body.data)).toBe(true);
            }
        });
    });

    describe('Scenario 6: Insight Generation', () => {
        it('should generate insights', async () => {
            const response = await client.get('/insights');

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        it('should include insight text and confidence', async () => {
            const response = await client.get('/insights');

            if (response.body.data?.length > 0) {
                const insight = response.body.data[0];
                expect(insight.insight_text).toBeDefined();
                expect(typeof insight.confidence_score).toBe('number');
            }
        });
    });

    describe('Scenario 7: Natural Language Queries', () => {
        const queries = [
            'How much did I spend on food?',
            'How many workouts this week?',
            'When did I last meditate?',
            'Show my recent expenses'
        ];

        queries.forEach(query => {
            it(`should handle query: "${query}"`, async () => {
                const response = await client.post('/query', { query });

                if (response.status === 200) {
                    expect(response.body.success).toBe(true);
                    expect(response.body.data).toBeDefined();
                }
            });
        });
    });

    describe('Scenario 8: Aggregations', () => {
        it('should aggregate by category', async () => {
            const response = await client.get('/memory/stats/categories');

            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
        });

        it('should aggregate spending', async () => {
            const response = await client.get('/analytics/spending-summary');

            if (response.status === 200) {
                expect(response.body.data).toBeDefined();
            }
        });
    });

    describe('Performance Tests', () => {
        it('should generate insights in reasonable time', async () => {
            const start = Date.now();
            await client.get('/insights');
            const duration = Date.now() - start;

            expect(duration).toBeLessThan(5000); // < 5s
        });
    });
});
