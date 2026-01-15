import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import HabitService from '../../src/services/habits/habitService.js';
import db from '../../src/db/index.js';
import llmService from '../../src/services/understanding/llmService.js';

// Mock dependencies
jest.mock('../../src/db/index.js', () => ({
    default: {
        query: jest.fn()
    }
}));

jest.mock('../../src/services/understanding/llmService.js', () => ({
    default: {
        model: {
            generateContent: jest.fn()
        }
    }
}));

describe('HabitService - AI-Powered Suggestions', () => {
    let habitService;

    beforeEach(() => {
        habitService = new HabitService();
        jest.clearAllMocks();
    });

    describe('getCategoryDistribution()', () => {
        it('should correctly distribute categories', () => {
            const patterns = [
                { category: 'fitness', count: '10' },
                { category: 'fitness', count: '5' },
                { category: 'finance', count: '8' },
                { category: 'mindfulness', count: '3' }
            ];

            const distribution = habitService.getCategoryDistribution(patterns);

            expect(distribution.fitness).toBe(15);
            expect(distribution.finance).toBe(8);
            expect(distribution.mindfulness).toBe(3);
        });

        it('should handle empty patterns', () => {
            const distribution = habitService.getCategoryDistribution([]);
            expect(Object.keys(distribution).length).toBe(0);
        });
    });

    describe('analyzeUserPatterns()', () => {
        it('should categorize recurring vs occasional patterns', async () => {
            db.query.mockResolvedValueOnce({
                rows: [
                    { category: 'fitness', normalized_data: { activity: 'workout' }, count: '10' },
                    { category: 'finance', normalized_data: { activity: 'expense' }, count: '4' },
                    { category: 'mindfulness', normalized_data: { activity: 'meditation' }, count: '3' }
                ]
            });

            const patterns = await habitService.analyzeUserPatterns('test-user');

            expect(patterns.recurring.length).toBe(1); // count >= 5
            expect(patterns.recurring[0].category).toBe('fitness');
            expect(patterns.occasional.length).toBe(2); // count 3-4
        });

        it('should handle database errors gracefully', async () => {
            db.query.mockRejectedValueOnce(new Error('DB error'));

            const patterns = await habitService.analyzeUserPatterns('test-user');

            expect(patterns.recurring).toEqual([]);
            expect(patterns.occasional).toEqual([]);
            expect(patterns.categories).toEqual({});
        });

        it('should query memory data from last 60 days', async () => {
            db.query.mockResolvedValueOnce({ rows: [] });

            await habitService.analyzeUserPatterns('test-user');

            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining("NOW() - INTERVAL '60 days'"),
                ['test-user']
            );
        });
    });

    describe('generateAISuggestions()', () => {
        const mockPatterns = {
            recurring: [
                { normalized_data: { activity: 'gym' }, category: 'fitness', count: '10' }
            ],
            occasional: [],
            categories: { fitness: 10 }
        };

        it('should generate AI suggestions from LLM', async () => {
            const mockResponse = {
                response: {
                    text: () => JSON.stringify([
                        {
                            habit_name: 'Morning Stretch',
                            habit_type: 'build',
                            category: 'fitness',
                            reason: 'Complement your gym routine with flexibility',
                            target_frequency: 7,
                            target_frequency_unit: 'weekly',
                            difficulty: 'easy'
                        },
                        {
                            habit_name: 'Track Spending',
                            habit_type: 'build',
                            category: 'finance',
                            reason: 'No financial tracking detected',
                            target_frequency: 7,
                            target_frequency_unit: 'weekly',
                            difficulty: 'easy'
                        },
                        {
                            habit_name: 'Late Night Snacking',
                            habit_type: 'quit',
                            category: 'health',
                            reason: 'Stop unhealthy eating patterns',
                            target_frequency: 0,
                            target_frequency_unit: 'weekly',
                            difficulty: 'medium'
                        }
                    ])
                }
            };

            llmService.model.generateContent.mockResolvedValueOnce(mockResponse);

            const suggestions = await habitService.generateAISuggestions('test-user', mockPatterns, []);

            expect(suggestions).toBeDefined();
            expect(suggestions.source).toBe('ai_generated');
            expect(suggestions.build.length).toBe(2);
            expect(suggestions.quit.length).toBe(1);
            expect(suggestions.generated_at).toBeDefined();
        });

        it('should handle JSON wrapped in code blocks', async () => {
            const mockResponse = {
                response: {
                    text: () => '```json\n[{"habit_name":"Test","habit_type":"build","category":"fitness","reason":"test","target_frequency":5,"target_frequency_unit":"weekly","difficulty":"easy"}]\n```'
                }
            };

            llmService.model.generateContent.mockResolvedValueOnce(mockResponse);

            const suggestions = await habitService.generateAISuggestions('test-user', mockPatterns, []);

            expect(suggestions).toBeDefined();
            expect(suggestions.build.length).toBeGreaterThan(0);
        });

        it('should return null for invalid JSON responses', async () => {
            const mockResponse = {
                response: {
                    text: () => 'Not a valid JSON response'
                }
            };

            llmService.model.generateContent.mockResolvedValueOnce(mockResponse);

            const suggestions = await habitService.generateAISuggestions('test-user', mockPatterns, []);

            expect(suggestions).toBeNull();
        });

        it('should return null for empty suggestions', async () => {
            const mockResponse = {
                response: {
                    text: () => '[]'
                }
            };

            llmService.model.generateContent.mockResolvedValueOnce(mockResponse);

            const suggestions = await habitService.generateAISuggestions('test-user', mockPatterns, []);

            expect(suggestions).toBeNull();
        });

        it('should handle LLM errors gracefully', async () => {
            llmService.model.generateContent.mockRejectedValueOnce(new Error('LLM API error'));

            const suggestions = await habitService.generateAISuggestions('test-user', mockPatterns, []);

            expect(suggestions).toBeNull();
        });

        it('should pass existing habits to LLM to avoid duplicates', async () => {
            const mockResponse = {
                response: {
                    text: () => JSON.stringify([
                        { habit_name: 'Test', habit_type: 'build', category: 'fitness', reason: 'test', target_frequency: 5, target_frequency_unit: 'weekly', difficulty: 'easy' }
                    ])
                }
            };

            llmService.model.generateContent.mockResolvedValueOnce(mockResponse);

            await habitService.generateAISuggestions('test-user', mockPatterns, ['morning workout', 'meditation']);

            const callArg = llmService.model.generateContent.mock.calls[0][0];
            expect(callArg).toContain('morning workout, meditation');
        });
    });

    describe('suggestHabits() - Integration', () => {
        it('should return AI suggestions when patterns exist', async () => {
            // Mock getUserHabits
            jest.spyOn(habitService, 'getUserHabits').mockResolvedValueOnce([]);

            // Mock pattern analysis
            db.query.mockResolvedValueOnce({
                rows: [
                    { category: 'fitness', normalized_data: { activity: 'workout' }, count: '10' }
                ]
            });

            // Mock AI suggestions
            const mockResponse = {
                response: {
                    text: () => JSON.stringify([
                        { habit_name: 'Morning Meditation', habit_type: 'build', category: 'mindfulness', reason: 'Balance your fitness routine', target_frequency: 5, target_frequency_unit: 'weekly', difficulty: 'easy' },
                        { habit_name: 'Track Meals', habit_type: 'build', category: 'health', reason: 'Support fitness goals', target_frequency: 7, target_frequency_unit: 'weekly', difficulty: 'medium' },
                        { habit_name: 'Late Night Scrolling', habit_type: 'quit', category: 'routine', reason: 'Improve sleep quality', target_frequency: 0, target_frequency_unit: 'weekly', difficulty: 'hard' }
                    ])
                }
            };

            llmService.model.generateContent.mockResolvedValueOnce(mockResponse);

            const suggestions = await habitService.suggestHabits('test-user');

            expect(suggestions.source).toBe('ai_generated');
            expect(suggestions.build.length).toBeGreaterThan(0);
            expect(suggestions.quit.length).toBeGreaterThan(0);
        });

        it('should fallback to templates when AI fails', async () => {
            jest.spyOn(habitService, 'getUserHabits').mockResolvedValueOnce([]);
            db.query.mockResolvedValueOnce({ rows: [{ category: 'fitness', count: '5' }] });
            llmService.model.generateContent.mockRejectedValueOnce(new Error('AI failure'));

            const suggestions = await habitService.suggestHabits('test-user');

            expect(suggestions.build).toBeDefined();
            expect(suggestions.quit).toBeDefined();
            expect(Array.isArray(suggestions.build)).toBe(true);
        });

        it('should fallback to templates when no patterns found', async () => {
            jest.spyOn(habitService, 'getUserHabits').mockResolvedValueOnce([]);
            db.query.mockResolvedValueOnce({ rows: [] });

            const suggestions = await habitService.suggestHabits('test-user');

            expect(suggestions.build).toBeDefined();
            expect(suggestions.quit).toBeDefined();
        });
    });
});
