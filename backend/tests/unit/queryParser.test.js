import { describe, test, expect, beforeEach } from '@jest/globals';
import { QueryParser } from '../../src/services/query/queryParser.js';

describe('QueryParser', () => {
    let queryParser;
    let mockDb;

    beforeEach(() => {
        queryParser = new QueryParser();

        // Mock database
        mockDb = {
            query: jest.fn()
        };
    });

    describe('normalizeQueryType', () => {
        test('handles exact match', () => {
            expect(queryParser.normalizeQueryType('CHECK_TODAY')).toBe('CHECK_TODAY');
        });

        test('handles lowercase', () => {
            expect(queryParser.normalizeQueryType('check_today')).toBe('CHECK_TODAY');
        });

        test('handles typos', () => {
            expect(queryParser.normalizeQueryType('check_tday')).toBe('CHECK_TODAY');
            expect(queryParser.normalizeQueryType('checktoday')).toBe('CHECK_TODAY');
            expect(queryParser.normalizeQueryType('todaycheck')).toBe('CHECK_TODAY');
        });

        test('handles spaces and hyphens', () => {
            expect(queryParser.normalizeQueryType('CHECK TODAY')).toBe('CHECK_TODAY');
            expect(queryParser.normalizeQueryType('check-today')).toBe('CHECK_TODAY');
        });

        test('handles last_occurrence variants', () => {
            expect(queryParser.normalizeQueryType('last_time')).toBe('LAST_OCCURRENCE');
            expect(queryParser.normalizeQueryType('when_last')).toBe('LAST_OCCURRENCE');
            expect(queryParser.normalizeQueryType('whenlast')).toBe('LAST_OCCURRENCE');
        });
    });

    describe('checkToday', () => {
        test('returns found when result exists', async () => {
            const mockResult = [{
                raw_input: 'I took vitamin C',
                created_at: new Date().toISOString()
            }];

            mockDb.query.mockResolvedValue(mockResult);

            const result = await queryParser.checkToday(
                'user-123',
                ['vitamin C'],
                mockDb
            );

            expect(result.found).toBe(true);
            expect(result.data.full_text).toBe('I took vitamin C');
            expect(result.data.time).toBeDefined();
        });

        test('returns not found when no result', async () => {
            mockDb.query.mockResolvedValue([]);

            const result = await queryParser.checkToday(
                'user-123',
                ['vitamin C'],
                mockDb
            );

            expect(result.found).toBe(false);
        });

        test('queries with multiple keywords', async () => {
            mockDb.query.mockResolvedValue([]);

            await queryParser.checkToday(
                'user-123',
                ['vitamin C', 'vitC', 'vitamin-C'],
                mockDb
            );

            const query = mockDb.query.mock.calls[0][0];
            expect(query).toContain('OR');
            expect(query).toContain('raw_input ILIKE ?');
        });
    });

    describe('findLastOccurrence', () => {
        test('calculates days ago correctly', async () => {
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

            const mockResult = [{
                raw_input: 'Watered plants',
                created_at: threeDaysAgo.toISOString()
            }];

            mockDb.query.mockResolvedValue(mockResult);

            const result = await queryParser.findLastOccurrence(
                'user-123',
                ['water plants'],
                mockDb
            );

            expect(result.found).toBe(true);
            expect(result.data.days_ago).toBe(3);
        });
    });

    describe('fillTemplate', () => {
        test('fills positive template when found', () => {
            const template = {
                positive: 'Yes, taken at {time}',
                negative: 'Not yet today'
            };

            const data = { time: '8:15 AM' };

            const answer = queryParser.fillTemplate(template, data, true);

            expect(answer).toBe('Yes, taken at 8:15 AM');
        });

        test('fills negative template when not found', () => {
            const template = {
                positive: 'Yes, taken at {time}',
                negative: 'Not yet today'
            };

            const answer = queryParser.fillTemplate(template, null, false);

            expect(answer).toBe('Not yet today');
        });

        test('fills multiple placeholders', () => {
            const template = {
                positive: '{days_ago} days ago on {date}',
                negative: 'Never'
            };

            const data = {
                days_ago: 3,
                date: 'January 13, 2026'
            };

            const answer = queryParser.fillTemplate(template, data, true);

            expect(answer).toBe('3 days ago on January 13, 2026');
        });
    });

    describe('calculateFrequency', () => {
        test('calculates per-week frequency', async () => {
            const mockResult = [{ count: 12 }];
            mockDb.query.mockResolvedValue(mockResult);

            const result = await queryParser.calculateFrequency(
                'user-123',
                ['exercise'],
                mockDb
            );

            expect(result.found).toBe(true);
            expect(result.data.frequency).toBeCloseTo(2.8, 1); // 12/30 * 7
        });
    });
});
