import { describe, test, expect, beforeEach } from '@jest/globals';
import { ConsistencyCalculator } from '../../src/services/query/consistencyCalculator.js';

describe('ConsistencyCalculator', () => {
    let calculator;
    let mockDb;

    beforeEach(() => {
        calculator = new ConsistencyCalculator();

        mockDb = {
            query: jest.fn()
        };
    });

    describe('buildPattern', () => {
        test('builds correct 7-day pattern', () => {
            const today = new Date();
            const yesterday = new Date();
            yesterday.setDate(today.getDate() - 1);

            const results = [
                { date: today.toISOString().split('T')[0] },
                { date: yesterday.toISOString().split('T')[0] }
            ];

            const pattern = calculator.buildPattern(results, 7);

            expect(pattern.length).toBe(7);
            expect(pattern[6]).toBe(1); // Today
            expect(pattern[5]).toBe(1); // Yesterday
        });

        test('fills gaps with zeros', () => {
            const today = new Date();
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(today.getDate() - 3);

            const results = [
                { date: today.toISOString().split('T')[0] },
                { date: threeDaysAgo.toISOString().split('T')[0] }
            ];

            const pattern = calculator.buildPattern(results, 7);

            expect(pattern[6]).toBe(1); // Today
            expect(pattern[5]).toBe(0); // Yesterday (missing)
            expect(pattern[4]).toBe(0); // 2 days ago (missing)
            expect(pattern[3]).toBe(1); // 3 days ago
        });
    });

    describe('calculateStreak', () => {
        test('calculates streak from end', () => {
            const pattern = [0, 0, 1, 1, 1, 1, 1];
            const streak = calculator.calculateStreak(pattern);
            expect(streak).toBe(5);
        });

        test('returns 0 for no streak', () => {
            const pattern = [1, 1, 1, 0, 0, 0, 0];
            const streak = calculator.calculateStreak(pattern);
            expect(streak).toBe(0);
        });

        test('returns full length for perfect streak', () => {
            const pattern = [1, 1, 1, 1, 1, 1, 1];
            const streak = calculator.calculateStreak(pattern);
            expect(streak).toBe(7);
        });
    });

    describe('calculate', () => {
        test('returns correct consistency data', async () => {
            const mockResults = [
                { date: '2026-01-16', count: 1 },
                { date: '2026-01-15', count: 1 },
                { date: '2026-01-14', count: 0 },
                { date: '2026-01-13', count: 1 },
                { date: '2026-01-12', count: 1 },
                { date: '2026-01-11', count: 1 }
            ];

            mockDb.query.mockResolvedValue(mockResults);

            const result = await calculator.calculate(
                'user-123',
                'vitamin C',
                ['vitamin C'],
                7,
                mockDb
            );

            expect(result.pattern).toBeDefined();
            expect(result.pattern.length).toBe(7);
            expect(result.adherence_percentage).toBeGreaterThan(0);
            expect(result.current_streak).toBeGreaterThanOrEqual(0);
            expect(result.total_logged).toBe(6);
        });

        test('handles no data', async () => {
            mockDb.query.mockResolvedValue([]);

            const result = await calculator.calculate(
                'user-123',
                'vitamin C',
                ['vitamin C'],
                7,
                mockDb
            );

            expect(result.pattern).toEqual([0, 0, 0, 0, 0, 0, 0]);
            expect(result.adherence_percentage).toBe(0);
            expect(result.current_streak).toBe(0);
            expect(result.total_logged).toBe(0);
        });
    });
});
