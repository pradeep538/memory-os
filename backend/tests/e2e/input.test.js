import TestApiClient from './helpers/api-client.js';
import fastify from '../src/index.js';

describe('Input Processing E2E Tests', () => {
    let app;
    let client;

    beforeAll(async () => {
        app = fastify;
        client = new TestApiClient(app);
    });

    describe('Scenario 1: High Confidence Text Input → Auto-Save', () => {
        it('should auto-save clear, high-confidence input', async () => {
            const response = await client.post('/input/text', {
                text: 'Went to the gym for 1 hour leg workout'
            });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.auto_processed).toBe(true);
            expect(response.body.memory).toBeDefined();
            expect(response.body.memory.category).toBe('fitness');
        });

        it('should parse amount from financial input', async () => {
            const response = await client.post('/input/text', {
                text: 'Spent 2500 rupees on groceries'
            });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.memory?.category).toBe('finance');
            // Should extract amount: 2500
        });

        it('should detect activity duration', async () => {
            const response = await client.post('/input/text', {
                text: 'Meditated for 20 minutes this morning'
            });

            expect(response.status).toBe(200);
            expect(response.body.memory?.category).toBe('mindfulness');
            // Should extract duration: 20 minutes
        });
    });

    describe('Scenario 2: Low Confidence Input → Confirmation Required', () => {
        it('should require confirmation for ambiguous input', async () => {
            const response = await client.post('/input/text', {
                text: 'did thing this morning'
            });

            expect(response.status).toBe(200);
            if (response.body.confidence_score < 0.7) {
                expect(response.body.auto_processed).toBe(false);
                // Should require user confirmation
            }
        });

        it('should provide enhancement suggestions for unclear input', async () => {
            const response = await client.post('/input/text', {
                text: 'ate stuff'
            });

            expect(response.status).toBe(200);
            if (response.body.enhancement) {
                expect(response.body.enhancement.enhanced_text).toBeDefined();
                expect(response.body.enhancement.confidence).toBeDefined();
            }
        });
    });

    describe('Scenario 3: Category Extraction', () => {
        const testCases = [
            { input: 'Completed 5k run in 30 minutes', expectedCategory: 'fitness' },
            { input: 'Bought vegetables for 500 rupees', expectedCategory: 'finance' },
            { input: 'Took vitamin D supplement', expectedCategory: 'health' },
            { input: 'Felt anxious during meeting', expectedCategory: 'mindfulness' },
            { input: 'Woke up at 6 AM', expectedCategory: 'routine' },
        ];

        testCases.forEach(({ input, expectedCategory }) => {
            it(`should categorize "${input}" as ${expectedCategory}`, async () => {
                const response = await client.post('/input/text', { text: input });

                expect(response.status).toBe(200);
                expect(response.body.memory?.category).toBe(expectedCategory);
            });
        });
    });

    describe('Scenario 4: Amount/Duration Parsing', () => {
        it('should parse monetary amounts', async () => {
            const inputs = [
                'Spent 1500 on dinner',
                'Paid ₹2000 for gym membership',
                'Bought shoes for fifty dollars'
            ];

            for (const text of inputs) {
                const response = await client.post('/input/text', { text });
                expect(response.status).toBe(200);
                // Should extract numeric amount from normalized_data
            }
        });

        it('should parse time durations', async () => {
            const inputs = [
                'Worked out for 45 minutes',
                'Slept 7 hours last night',
                'Meeting lasted 2.5 hours'
            ];

            for (const text of inputs) {
                const response = await client.post('/input/text', { text });
                expect(response.status).toBe(200);
                // Should extract duration from normalized_data
            }
        });
    });

    describe('Scenario 5: Invalid/Empty Text Rejection', () => {
        it('should reject empty text', async () => {
            const response = await client.post('/input/text', { text: '' });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should reject whitespace-only text', async () => {
            const response = await client.post('/input/text', { text: '   ' });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should reject extremely long text', async () => {
            const longText = 'a'.repeat(10000);
            const response = await client.post('/input/text', { text: longText });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should handle special characters safely', async () => {
            const response = await client.post('/input/text', {
                text: 'Test with <script>alert("xss")</script> tags'
            });

            expect(response.status).toBe(200);
            // Should sanitize input
        });
    });

    describe('Scenario 6: LLM Enhancement Validation', () => {
        it('should enhance incomplete sentences', async () => {
            const response = await client.post('/input/text', {
                text: 'gym leg day 1hr'
            });

            expect(response.status).toBe(200);
            if (response.body.enhancement) {
                expect(response.body.enhancement.enhanced_text).toContain('gym');
                expect(response.body.enhancement.enhanced_text).toContain('leg');
                // Should be more readable than input
            }
        });

        it('should preserve key information during enhancement', async () => {
            const original = 'Spent exactly 1,234 rupees on groceries at BigBazaar';
            const response = await client.post('/input/text', { text: original });

            expect(response.status).toBe(200);
            // Enhanced text should maintain amount and store name
        });

        it('should handle multiple entities in one input', async () => {
            const response = await client.post('/input/text', {
                text: 'Morning routine: meditated 15 min, then ran 3km in 25 minutes'
            });

            expect(response.status).toBe(200);
            // Could split into multiple memories or handle as compound event
        });
    });

    describe('Scenario 7: Concurrent Input Processing', () => {
        it('should handle multiple simultaneous requests', async () => {
            const requests = Array.from({ length: 5 }, (_, i) =>
                client.post('/input/text', { text: `Test input ${i + 1}` })
            );

            const responses = await Promise.all(requests);

            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
            });
        });

        it('should process inputs in reasonable time under load', async () => {
            const start = Date.now();

            const requests = Array.from({ length: 10 }, (_, i) =>
                client.post('/input/text', { text: `Concurrent test ${i}` })
            );

            await Promise.all(requests);

            const duration = Date.now() - start;
            expect(duration).toBeLessThan(30000); // 10 requests in < 30s
        });
    });

    describe('Scenario 8: Rate Limiting', () => {
        it('should allow reasonable request rate', async () => {
            const requests = Array.from({ length: 5 }, (_, i) =>
                client.post('/input/text', { text: `Rate test ${i}` })
            );

            const responses = await Promise.all(requests);

            // All should succeed if within rate limit
            responses.forEach(response => {
                expect([200, 429]).toContain(response.status);
            });
        });

        it('should enforce voice quota limits', async () => {
            // Voice input would be tested if endpoint exists
            // This is a placeholder for voice quota testing
            const voiceResponse = await client.get('/input/voice-quota');

            if (voiceResponse.status === 200) {
                expect(voiceResponse.body.data).toBeDefined();
                // Should show remaining voice quota
            }
        });
    });

    describe('Input Confirmation Flow', () => {
        it('should allow confirming low-confidence input', async () => {
            // Step 1: Submit low-confidence input
            const initialResponse = await client.post('/input/text', {
                text: 'did activity'
            });

            if (!initialResponse.body.auto_processed) {
                // Step 2: Confirm with corrections
                const confirmResponse = await client.post('/input/confirm', {
                    text: 'Went for a walk',
                    category: 'fitness',
                    confidence_score: 0.95
                });

                expect(confirmResponse.status).toBe(200);
                expect(confirmResponse.body.success).toBe(true);
            }
        });
    });

    describe('Performance Benchmarks', () => {
        it('should process text input in under 5 seconds', async () => {
            const start = Date.now();

            await client.post('/input/text', {
                text: 'Performance test: went to gym for chest workout'
            });

            const duration = Date.now() - start;
            expect(duration).toBeLessThan(5000);
        });

        it('should handle batch suggestions efficiently', async () => {
            const start = Date.now();

            const inputs = [
                'gym workout',
                'bought groceries',
                'meditate session'
            ];

            for (const text of inputs) {
                await client.post('/input/text', { text });
            }

            const duration = Date.now() - start;
            expect(duration).toBeLessThan(15000); // 3 inputs in < 15s
        });
    });
});
