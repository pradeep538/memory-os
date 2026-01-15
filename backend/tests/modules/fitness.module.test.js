import FitnessModule from '../../src/modules/fitness/fitness.module.js';
import db from '../../src/db/index.js';

// Mock the database
jest.mock('../../src/db/index.js', () => ({
    default: {
        query: jest.fn()
    }
}));

describe('FitnessModule', () => {
    let module;

    beforeEach(() => {
        module = new FitnessModule();
        jest.clearAllMocks();
    });

    describe('Module Initialization', () => {
        test('should initialize with correct metadata', () => {
            expect(module.category).toBe('fitness');
            expect(module.name).toBe('Fitness & Workouts');
            expect(module.version).toBe('1.0.0');
        });

        test('should have correct capabilities', () => {
            const metadata = module.getMetadata();
            expect(metadata.capabilities.processMemory).toBe(true);
            expect(metadata.capabilities.generateInsights).toBe(true);
            expect(metadata.capabilities.workoutTracking).toBe(true);
            expect(metadata.capabilities.splitDetection).toBe(true);
        });

        test('should have supported workout types', () => {
            const metadata = module.getMetadata();
            expect(metadata.supportedWorkoutTypes).toContain('strength');
            expect(metadata.supportedWorkoutTypes).toContain('cardio');
            expect(metadata.supportedWorkoutTypes).toContain('flexibility');
        });
    });

    describe('detectWorkoutType()', () => {
        test('should detect strength training', () => {
            expect(module.detectWorkoutType('chest workout')).toBe('strength');
            expect(module.detectWorkoutType('bench press 3x8')).toBe('strength');
            expect(module.detectWorkoutType('leg day - squats')).toBe('strength');
        });

        test('should detect cardio', () => {
            expect(module.detectWorkoutType('running 5k')).toBe('cardio');
            expect(module.detectWorkoutType('cycling for 30 minutes')).toBe('cardio');
            expect(module.detectWorkoutType('treadmill session')).toBe('cardio');
        });

        test('should detect flexibility', () => {
            expect(module.detectWorkoutType('yoga class')).toBe('flexibility');
            expect(module.detectWorkoutType('stretching session')).toBe('flexibility');
        });

        test('should detect sports', () => {
            expect(module.detectWorkoutType('basketball game')).toBe('sports');
            expect(module.detectWorkoutType('played tennis')).toBe('sports');
        });

        test('should default to general for unknown types', () => {
            expect(module.detectWorkoutType('walking')).toBe('general');
        });
    });

    describe('categorizeForSplit()', () => {
        test('should categorize push exercises', () => {
            expect(module.categorizeForSplit('chest workout')).toBe('push');
            expect(module.categorizeForSplit('shoulder press')).toBe('push');
            expect(module.categorizeForSplit('tricep dips')).toBe('push');
        });

        test('should categorize pull exercises', () => {
            expect(module.categorizeForSplit('back day - rows')).toBe('pull');
            expect(module.categorizeForSplit('pull-ups')).toBe('pull');
            expect(module.categorizeForSplit('bicep curls')).toBe('pull');
        });

        test('should categorize leg exercises', () => {
            expect(module.categorizeForSplit('leg day - squats')).toBe('legs');
            expect(module.categorizeForSplit('deadlifts')).toBe('legs');
        });

        test('should categorize upper/lower', () => {
            expect(module.categorizeForSplit('upper body')).toBe('upper');
            expect(module.categorizeForSplit('lower body')).toBe('lower');
        });

        test('should return other for unknown exercises', () => {
            expect(module.categorizeForSplit('general workout')).toBe('other');
        });
    });

    describe('processMemory()', () => {
        test('should process strength workout successfully', async () => {
            // Mock database queries
            db.query
                .mockResolvedValueOnce({ rows: [{ count: '12' }] }) // getRecentWorkoutFrequency
                .mockResolvedValueOnce({ rows: [{ created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }, { created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }] }) // getDaysSinceLastWorkout
                .mockResolvedValueOnce({ rows: [] }); // detectWorkoutSplit

            const memory = {
                user_id: 'test-user',
                normalized_data: {
                    activity: 'chest workout',
                    duration_minutes: 45
                }
            };

            const result = await module.processMemory(memory);

            expect(result.processed).toBe(true);
            expect(result.workoutType).toBe('strength');
            expect(result.workoutsThisMonth).toBe(12);
            expect(result.averagePerWeek).toBeDefined();
        });

        test('should detect rest days', async () => {
            db.query
                .mockResolvedValueOnce({ rows: [{ count: '8' }] })
                .mockResolvedValueOnce({
                    rows: [
                        { created_at: new Date() },
                        { created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }
                    ]
                })
                .mockResolvedValueOnce({ rows: [] });

            const memory = {
                user_id: 'test-user',
                normalized_data: {
                    activity: 'back workout',
                    duration_minutes: 40
                }
            };

            const result = await module.processMemory(memory);

            expect(result.hadRestDay).toBe(true);
            expect(result.restDays).toBe(3);
        });

        test('should handle missing activity gracefully', async () => {
            const memory = {
                user_id: 'test-user',
                normalized_data: {}
            };

            const result = await module.processMemory(memory);

            expect(result.processed).toBe(false);
            expect(result.message).toBe('No activity identified');
        });

        test('should handle database errors gracefully', async () => {
            db.query.mockRejectedValue(new Error('Database error'));

            const memory = {
                user_id: 'test-user',
                normalized_data: {
                    activity: 'workout'
                }
            };

            const result = await module.processMemory(memory);

            expect(result.processed).toBe(false);
            expect(result.error).toBe('Database error');
        });
    });

    describe('generateInsights()', () => {
        test('should generate workout warrior insight for high frequency', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ count: '16' }] }); // 16 workouts in 30 days = 3.7/week

            const insights = await module.generateInsights('test-user');

            expect(insights.length).toBeGreaterThan(0);
            expect(insights[0].type).toBe('achievement');
            expect(insights[0].category).toBe('fitness');
            expect(insights[0].title).toBe('Workout Warrior');
        });

        test('should generate solid routine insight for moderate frequency', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ count: '8' }] }); // 8 workouts in 30 days = 1.9/week

            const insights = await module.generateInsights('test-user');

            expect(insights.length).toBeGreaterThan(0);
            expect(insights[0].type).toBe('progress');
            expect(insights[0].title).toBe('Solid Routine');
        });

        test('should return empty insights for low frequency', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ count: '2' }] }); // 2 workouts in 30 days

            const insights = await module.generateInsights('test-user');

            expect(insights.length).toBe(0);
        });
    });

    describe('isPPLSequence()', () => {
        test('should recognize valid PPL sequences', () => {
            expect(module.isPPLSequence(['push', 'pull', 'legs'])).toBe(true);
            expect(module.isPPLSequence(['pull', 'legs', 'push'])).toBe(true);
            expect(module.isPPLSequence(['legs', 'push', 'pull'])).toBe(true);
        });

        test('should reject invalid sequences', () => {
            expect(module.isPPLSequence(['push', 'push', 'legs'])).toBe(false);
            expect(module.isPPLSequence(['upper', 'lower', 'upper'])).toBe(false);
            expect(module.isPPLSequence(['push', 'legs', 'pull'])).toBe(false);
        });
    });
});
