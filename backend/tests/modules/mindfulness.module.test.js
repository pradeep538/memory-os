import MindfulnessModule from '../../src/modules/mindfulness/mindfulness.module.js';
import db from '../../src/db/index.js';

jest.mock('../../src/db/index.js', () => ({
    default: {
        query: jest.fn()
    }
}));

describe('MindfulnessModule', () => {
    let module;

    beforeEach(() => {
        module = new MindfulnessModule();
        jest.clearAllMocks();
    });

    describe('Module Initialization', () => {
        test('should initialize with correct metadata', () => {
            expect(module.category).toBe('mindfulness');
            expect(module.name).toBe('Mindfulness & Mental Wellness');
        });

        test('should have correct capabilities', () => {
            const metadata = module.getMetadata();
            expect(metadata.capabilities.trackMeditation).toBe(true);
            expect(metadata.capabilities.trackMood).toBe(true);
            expect(metadata.capabilities.trackGratitude).toBe(true);
        });

        test('should support multiple mindfulness types', () => {
            const metadata = module.getMetadata();
            expect(metadata.supportedTypes).toContain('meditation');
            expect(metadata.supportedTypes).toContain('mood');
            expect(metadata.supportedTypes).toContain('gratitude');
        });
    });

    describe('detectMindfulnessType()', () => {
        test('should detect meditation', () => {
            expect(module.detectMindfulnessType({ activity: 'meditated for 20 minutes' })).toBe('meditation');
            expect(module.detectMindfulnessType({ note: 'breathwork session' })).toBe('meditation');
        });

        test('should detect mood', () => {
            expect(module.detectMindfulnessType({ note: 'feeling happy today' })).toBe('mood');
            expect(module.detectMindfulnessType({ mood: 'anxious' })).toBe('mood');
        });

        test('should detect gratitude', () => {
            expect(module.detectMindfulnessType({ note: 'grateful for my family' })).toBe('gratitude');
            expect(module.detectMindfulnessType({ gratitude: ['health', 'friends'] })).toBe('gratitude');
        });

        test('should detect reflection', () => {
            expect(module.detectMindfulnessType({ note: 'reflecting on my goals' })).toBe('reflection');
            expect(module.detectMindfulnessType({ activity: 'journaling' })).toBe('reflection');
        });

        test('should default to general', () => {
            expect(module.detectMindfulnessType({ note: 'general wellness' })).toBe('general');
        });
    });

    describe('detectMood()', () => {
        test('should detect positive moods', () => {
            expect(module.detectMood({ note: 'feeling happy' })).toBe('positive');
            expect(module.detectMood({ feeling: 'great day' })).toBe('positive');
        });

        test('should detect negative moods', () => {
            expect(module.detectMood({ note: 'feeling sad' })).toBe('negative');
            expect(module.detectMood({ feeling: 'depressed' })).toBe('negative');
        });

        test('should detect anxious moods', () => {
            expect(module.detectMood({ note: 'feeling anxious' })).toBe('anxious');
            expect(module.detectMood({ feeling: 'stressed about work' })).toBe('anxious');
        });

        test('should detect calm moods', () => {
            expect(module.detectMood({ note: 'feeling peaceful' })).toBe('calm');
            expect(module.detectMood({ feeling: 'relaxed' })).toBe('calm');
        });
    });

    describe('processMeditation()', () => {
        test('should process meditation with milestone', async () => {
            db.query.mockResolvedValueOnce({
                rows: [{ count: '50', total_minutes: '600', avg_duration: '12' }]
            });

            const result = await module.processMeditation('test-user', {
                duration_minutes: 20,
                technique: 'breathwork'
            });

            expect(result.duration).toBe(20);
            expect(result.technique).toBe('breathwork');
            expect(result.totalSessions).toBe(50);
            expect(result.totalMinutes).toBe(600);
            expect(result.milestone).toBeTruthy();
        });

        test('should detect meditation technique', async () => {
            db.query.mockResolvedValueOnce({
                rows: [{ count: '10', total_minutes: '100', avg_duration: '10' }]
            });

            const result = await module.processMeditation('test-user', {
                note: 'body scan meditation',
                duration: 15
            });

            expect(result.technique).toBe('body_scan');
        });
    });

    describe('processMood()', () => {
        test('should process mood with trend and suggestion', async () => {
            db.query.mockResolvedValueOnce({
                rows: [
                    { mood: 'positive', created_at: new Date() },
                    { mood: 'positive', created_at: new Date() },
                    { mood: 'calm', created_at: new Date() }
                ]
            });

            const result = await module.processMood('test-user', {
                mood: 'anxious',
                intensity: 'high'
            });

            expect(result.type).toBe('anxious');
            expect(result.intensity).toBe('high');
            expect(result.suggestion).toBeTruthy();
        });
    });

    describe('getMindfulnessStreak()', () => {
        test('should calculate streak correctly', async () => {
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            const twoDaysAgo = new Date(today);
            twoDaysAgo.setDate(today.getDate() - 2);

            db.query.mockResolvedValueOnce({
                rows: [
                    { practice_date: today.toISOString() },
                    { practice_date: yesterday.toISOString() },
                    { practice_date: twoDaysAgo.toISOString() }
                ]
            });

            const streak = await module.getMindfulnessStreak('test-user');

            expect(streak).toBe(3);
        });

        test('should return 0 for broken streak', async () => {
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

            db.query.mockResolvedValueOnce({
                rows: [{ practice_date: threeDaysAgo.toISOString() }]
            });

            const streak = await module.getMindfulnessStreak('test-user');

            expect(streak).toBe(0);
        });
    });

    describe('generateInsights()', () => {
        test('should generate meditation habit achievement', async () => {
            db.query.mockResolvedValueOnce({
                rows: [{ count: '25', total_minutes: '500', avg_duration: '20' }]
            });

            const insights = await module.generateInsights('test-user');

            expect(insights.length).toBeGreaterThan(0);
            expect(insights[0].type).toBe('achievement');
            expect(insights[0].title).toBe('Meditation Habit Formed');
        });

        test('should generate mood warning for declining trend', async () => {
            db.query
                .mockResolvedValueOnce({ rows: [{ count: '5', total_minutes: '50', avg_duration: '10' }] })
                .mockResolvedValueOnce({
                    rows: [
                        { mood: 'negative' },
                        { mood: 'anxious' },
                        { mood: 'frustrated' },
                        { mood: 'positive' }
                    ]
                });

            const insights = await module.generateInsights('test-user');

            const moodWarnings = insights.filter(i => i.type === 'warning');
            expect(moodWarnings.length).toBeGreaterThan(0);
        });
    });
});
