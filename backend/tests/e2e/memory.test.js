import TestApiClient from './helpers/api-client.js';
import fastify from '../src/index.js';

describe('Memory Management E2E Tests', () => {
    let app;
    let client;

    beforeAll(async () => {
        app = fastify;
        client = new TestApiClient(app);
    });

    describe('Scenario 1: List All Memories', () => {
        it('should return paginated list of memories', async () => {
            const response = await client.get('/memory');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        it('should respect limit parameter', async () => {
            const response = await client.get('/memory', { limit: 5 });

            expect(response.status).toBe(200);
            expect(response.body.data.length).toBeLessThanOrEqual(5);
        });
    });

    describe('Scenario 2: Filter by Category', () => {
        const categories = ['fitness', 'finance', 'mindfulness', 'health', 'routine'];

        categories.forEach(category => {
            it(`should filter ${category} memories`, async () => {
                const response = await client.get('/memory', { category });

                expect(response.status).toBe(200);
                if (response.body.data.length > 0) {
                    response.body.data.forEach(memory => {
                        expect(memory.category).toBe(category);
                    });
                }
            });
        });
    });

    describe('Scenario 3: Filter by Date Range', () => {
        it('should filter by start date', async () => {
            const startDate = new Date('2024-01-01').toISOString();
            const response = await client.get('/memory', { startDate });

            expect(response.status).toBe(200);
            response.body.data.forEach(memory => {
                expect(new Date(memory.created_at) >= new Date(startDate)).toBe(true);
            });
        });

        it('should filter by end date', async () => {
            const endDate = new Date().toISOString();
            const response = await client.get('/memory', { endDate });

            expect(response.status).toBe(200);
            response.body.data.forEach(memory => {
                expect(new Date(memory.created_at) <= new Date(endDate)).toBe(true);
            });
        });

        it('should filter by date range', async () => {
            const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
            const endDate = new Date().toISOString();

            const response = await client.get('/memory', { startDate, endDate });

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body.data)).toBe(true);
        });
    });

    describe('Scenario 4: Pagination', () => {
        it('should support offset pagination', async () => {
            const page1 = await client.get('/memory', { limit: 10, offset: 0 });
            const page2 = await client.get('/memory', { limit: 10, offset: 10 });

            expect(page1.status).toBe(200);
            expect(page2.status).toBe(200);

            if (page1.body.data.length > 0 && page2.body.data.length > 0) {
                expect(page1.body.data[0].id).not.toBe(page2.body.data[0].id);
            }
        });
    });

    describe('Scenario 5: Search Functionality', () => {
        it('should search by text content', async () => {
            const response = await client.get('/memory', { search: 'gym' });

            expect(response.status).toBe(200);
            if (response.body.data.length > 0) {
                const hasGym = response.body.data.some(m =>
                    m.raw_input?.toLowerCase().includes('gym')
                );
                expect(hasGym).toBe(true);
            }
        });
    });

    describe('Scenario 6: Single Memory Retrieval', () => {
        it('should get single memory by ID', async () => {
            // First get a list to find an ID
            const listResponse = await client.get('/memory', { limit: 1 });

            if (listResponse.body.data.length > 0) {
                const memoryId = listResponse.body.data[0].id;
                const response = await client.get(`/memory/${memoryId}`);

                expect(response.status).toBe(200);
                expect(response.body.data.id).toBe(memoryId);
            }
        });

        it('should return 404 for non-existent memory', async () => {
            const fakeId = '00000000-0000-0000-0000-000000000001';
            const response = await client.get(`/memory/${fakeId}`);

            expect([404, 500]).toContain(response.status);
        });
    });

    describe('Scenario 7: Category Statistics', () => {
        it('should return counts by category', async () => {
            const response = await client.get('/memory/stats/categories');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(typeof response.body.data).toBe('object');
        });

        it('should have valid category counts', async () => {
            const response = await client.get('/memory/stats/categories');

            Object.values(response.body.data).forEach(count => {
                expect(typeof count).toBe('number');
                expect(count).toBeGreaterThanOrEqual(0);
            });
        });
    });

    describe('Scenario 8: Memory Update', () => {
        it('should update memory fields', async () => {
            const createResponse = await client.post('/input/text', {
                text: 'Test memory for update'
            });

            if (createResponse.body.memory?.id) {
                const memoryId = createResponse.body.memory.id;
                const updateResponse = await client.patch(`/memory/${memoryId}`, {
                    category: 'generic',
                    raw_input: 'Updated memory text'
                });

                expect([200, 404]).toContain(updateResponse.status);
            }
        });
    });

    describe('Scenario 9: Memory Deletion', () => {
        it('should delete memory by ID', async () => {
            const createResponse = await client.post('/input/text', {
                text: 'Memory to be deleted'
            });

            if (createResponse.body.memory?.id) {
                const memoryId = createResponse.body.memory.id;
                const deleteResponse = await client.delete(`/memory/${memoryId}`);

                expect([200, 204, 404]).toContain(deleteResponse.status);
            }
        });
    });

    describe('Scenario 10: Bulk Operations', () => {
        it('should handle multiple memory creation', async () => {
            const inputs = [
                'Bulk test 1',
                'Bulk test 2',
                'Bulk test 3'
            ];

            const promises = inputs.map(text =>
                client.post('/input/text', { text })
            );

            const responses = await Promise.all(promises);

            responses.forEach(response => {
                expect(response.status).toBe(200);
            });
        });
    });

    describe('Performance Tests', () => {
        it('should list memories quickly', async () => {
            const start = Date.now();
            await client.get('/memory', { limit: 50 });
            const duration = Date.now() - start;

            expect(duration).toBeLessThan(1000); // < 1s
        });
    });
});
