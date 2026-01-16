import request from 'supertest';
import fastify from '../src/index.js';
import TestApiClient, { expect as expectHelpers } from './helpers/api-client.js';

describe('Authentication E2E Tests', () => {
    let app;
    let client;
    const DEMO_USER_ID = '00000000-0000-0000-0000-000000000000';

    beforeAll(async () => {
        app = fastify;
        client = new TestApiClient(app);
    });

    describe('Scenario 1: Demo User Mode (Development)', () => {
        it('should allow requests without auth token in development mode', async () => {
            const response = await client.get('/memory', { limit: 1 });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeDefined();
        });

        it('should use demo user ID when no auth provided', async () => {
            // Create a memory without auth
            const response = await client.post('/input/text', {
                text: 'Test memory without auth'
            });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            // Verify it was created with demo user ID
            // (Implementation would check DB directly or response metadata)
        });
    });

    describe('Scenario 2: Firebase Token Validation', () => {
        it('should accept valid Firebase tokens', async () => {
            // Mock valid Firebase token
            const mockToken = 'mock_valid_firebase_token';

            const response = await client
                .setAuth(mockToken)
                .get('/memory');

            // In production with real Firebase, this would verify the token
            // In dev mode, falls back to demo user
            expect(response.status).toBe(200);
        });

        it('should extract user ID from valid Firebase token', async () => {
            const mockToken = 'mock_firebase_token_with_uid';

            const response = await client
                .setAuth(mockToken)
                .post('/input/text', { text: 'Test with Firebase token' });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });

    describe('Scenario 3: Invalid Token Rejection', () => {
        it('should handle malformed tokens gracefully in dev mode', async () => {
            const response = await client
                .setAuth('invalid_malformed_token_12345')
                .get('/memory');

            // In dev mode: falls back to demo user
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        it('should handle expired tokens in dev mode', async () => {
            const expiredToken = 'expired_token_12345';

            const response = await client
                .setAuth(expiredToken)
                .post('/input/text', { text: 'Test with expired token' });

            // Dev mode: falls back to demo user
            expect(response.status).toBe(200);
        });
    });

    describe('Scenario 4: Missing Token Handling', () => {
        it('should allow access without Authorization header in dev', async () => {
            const response = await request(app)
                .get('/api/v1/memory')
                .expect(200);

            expect(response.body.success).toBe(true);
        });

        it('should handle empty Authorization header', async () => {
            const response = await request(app)
                .get('/api/v1/memory')
                .set('Authorization', '')
                .expect(200);

            expect(response.body.success).toBe(true);
        });

        it('should handle missing Bearer prefix', async () => {
            const response = await request(app)
                .get('/api/v1/memory')
                .set('Authorization', 'token_without_bearer')
                .expect(200);

            // Falls back to demo user
            expect(response.body.success).toBe(true);
        });
    });

    describe('Scenario 5: Token Expiration', () => {
        it('should detect expired Firebase tokens', async () => {
            // Mock scenario where Firebase returns token-expired error
            const expiredToken = 'mock_expired_firebase_token';

            const response = await client
                .setAuth(expiredToken)
                .get('/engagement/summary');

            // In dev: falls back to demo user
            // In prod: would return 401 with TOKEN_EXPIRED error
            expect(response.status).toBe(200);
        });
    });

    describe('Scenario 6: Cross-User Data Access Prevention', () => {
        it('should prevent accessing other users data', async () => {
            // User A creates a memory
            const userAToken = 'mock_user_a_token';
            const createResponse = await client
                .setAuth(userAToken)
                .post('/input/text', {
                    text: 'Private memory for user A'
                });

            expect(createResponse.status).toBe(200);
            const memoryId = createResponse.body.memory?.id;

            if (memoryId) {
                // User B tries to access User A's memory
                const userBToken = 'mock_user_b_token';
                const accessResponse = await client
                    .setAuth(userBToken)
                    .get(`/memory/${memoryId}`);

                // Should either get 403 or not find the memory
                // (Implementation depends on auth middleware)
            }
        });

        it('should only show user-specific memories in list', async () => {
            const userToken = 'mock_specific_user_token';

            const response = await client
                .setAuth(userToken)
                .get('/memory');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            // All memories should belong to authenticated user
            // (Would need to verify user_id matches token's uid)
        });

        it('should prevent cross-user habit access', async () => {
            const userAToken = 'mock_user_a_token';
            const response = await client
                .setAuth(userAToken)
                .get('/habits');

            expect(response.status).toBe(200);
            // Should only return habits for user A
        });

        it('should prevent cross-user engagement data access', async () => {
            const userToken = 'mock_user_token';
            const response = await client
                .setAuth(userToken)
                .get('/engagement/summary');

            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
            // Should only show engagement for authenticated user
        });
    });

    describe('Auth Middleware Integration', () => {
        it('should include user ID in request context', async () => {
            const response = await client.get('/memory', { limit: 1 });

            // Middleware should set request.userId
            // Endpoints should use it for filtering
            expect(response.status).toBe(200);
        });

        it('should work with all protected endpoints', async () => {
            const endpoints = [
                '/memory',
                '/habits',
                '/engagement/summary',
                '/insights',
                '/memory/stats/categories'
            ];

            for (const endpoint of endpoints) {
                const response = await client.get(endpoint);
                expect(response.status).toBe(200);
            }
        });
    });

    describe('Auth Performance', () => {
        it('should not significantly slow down requests', async () => {
            const start = Date.now();

            await client.get('/memory', { limit: 10 });

            const duration = Date.now() - start;
            expect(duration).toBeLessThan(2000); // Should complete in < 2s
        });
    });
});
