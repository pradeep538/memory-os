import HealthModule from '../../src/modules/health/health.module.js';
import db from '../../src/db/index.js';

jest.mock('../../src/db/index.js', () => ({
    default: {
        query: jest.fn()
    }
}));

describe('HealthModule', () => {
    let module;

    beforeEach(() => {
        module = new HealthModule();
        jest.clearAllMocks();
    });

    describe('Module Initialization', () => {
        test('should initialize with correct metadata', () => {
            expect(module.category).toBe('health');
            expect(module.name).toBe('Health & Wellness');
        });

        test('should have correct capabilities', () => {
            const metadata = module.getMetadata();
            expect(metadata.capabilities.trackSleep).toBe(true);
            expect(metadata.capabilities.trackVitals).toBe(true);
            expect(metadata.capabilities.trackSymptoms).toBe(true);
            expect(metadata.capabilities.trackMedications).toBe(true);
        });

        test('should support health event types', () => {
            const metadata = module.getMetadata();
            expect(metadata.supportedTypes).toContain('sleep');
            expect(metadata.supportedTypes).toContain('vitals');
            expect(metadata.supportedTypes).toContain('symptoms');
        });
    });

    describe('detectHealthType()', () => {
        test('should detect sleep events', () => {
            expect(module.detectHealthType({ note: 'slept for 8 hours' })).toBe('sleep');
            expect(module.detectHealthType({ activity: 'took a nap' })).toBe('sleep');
        });

        test('should detect vital signs', () => {
            expect(module.detectHealthType({ blood_pressure: '120/80' })).toBe('vitals');
            expect(module.detectHealthType({ heart_rate: 75 })).toBe('vitals');
            expect(module.detectHealthType({ note: 'measured weight' })).toBe('vitals');
        });

        test('should detect symptoms', () => {
            expect(module.detectHealthType({ note: 'headache since morning' })).toBe('symptom');
            expect(module.detectHealthType({ symptom: 'fever' })).toBe('symptom');
        });

        test('should detect medications', () => {
            expect(module.detectHealthType({ note: 'took vitamin D' })).toBe('medication');
            expect(module.detectHealthType({ medication: 'aspirin' })).toBe('medication');
        });

        test('should detect appointments', () => {
            expect(module.detectHealthType({ note: 'doctor appointment' })).toBe('appointment');
            expect(module.detectHealthType({ activity: 'hospital checkup' })).toBe('appointment');
        });

        test('should default to general', () => {
            expect(module.detectHealthType({ note: 'general wellness' })).toBe('general');
        });
    });

    describe('processSleep()', () => {
        test('should process sleep with quality estimation', async () => {
            db.query.mockResolvedValueOnce({
                rows: [{ avg_duration: '420' }] // 7 hours average
            });

            const result = await module.processSleep('test-user', {
                duration_minutes: 480, // 8 hours
                note: 'slept well'
            });

            expect(result.duration).toBe(480);
            expect(result.quality).toBe('good');
            expect(result.comparison).toBe('above_average');
        });

        test('should handle poor sleep quality', async () => {
            db.query.mockResolvedValueOnce({
                rows: [{ avg_duration: '420' }]
            });

            const result = await module.processSleep('test-user', {
                duration: 360,
                note: 'restless sleep'
            });

            expect(result.quality).toBe('poor');
        });
    });

    describe('processVitals()', () => {
        test('should process blood pressure and detect alerts', async () => {
            const result = await module.processVitals('test-user', {
                blood_pressure: '150/95'
            });

            expect(result.bloodPressure).toBe('150/95');
            expect(result.alerts.length).toBeGreaterThan(0);
            expect(result.alerts[0].type).toBe('warning');
        });

        test('should process heart rate', async () => {
            const result = await module.processVitals('test-user', {
                heart_rate: 105
            });

            expect(result.heartRate).toBe(105);
            expect(result.alerts.length).toBeGreaterThan(0);
        });

        test('should process normal vitals without alerts', async () => {
            const result = await module.processVitals('test-user', {
                blood_pressure: '120/80',
                heart_rate: 70
            });

            expect(result.bloodPressure).toBe('120/80');
            expect(result.heartRate).toBe(70);
            expect(result.alerts.length).toBe(0);
        });
    });

    describe('processSymptom()', () => {
        test('should process symptom and check for recurring', async () => {
            db.query.mockResolvedValueOnce({
                rows: [{ count: '4' }] // 4 occurrences = recurring
            });

            const result = await module.processSymptom('test-user', {
                symptom_type: 'headache',
                severity: 'medium'
            });

            expect(result.type).toBe('headache');
            expect(result.severity).toBe('medium');
            expect(result.recurring).toBe(true);
            expect(result.recommendation).toBeTruthy();
        });

        test('should estimate severity from context', async () => {
            db.query.mockResolvedValueOnce({
                rows: [{ count: '1' }]
            });

            const result = await module.processSymptom('test-user', {
                note: 'severe back pain - unbearable'
            });

            expect(result.severity).toBe('high');
        });
    });

    describe('processMedication', () => {
        test('should track medication adherence', async () => {
            db.query.mockResolvedValueOnce({
                rows: [{ count: '6' }] // 6 out of 7 days
            });

            const result = await module.processMedication('test-user', {
                medication: 'Vitamin D',
                dosage: '1000 IU'
            });

            expect(result.name).toBe('Vitamin D');
            expect(result.dosage).toBe('1000 IU');
            expect(result.adherence.doses_taken).toBe(6);
            expect(result.adherence.adherence_rate).toBeCloseTo(85.7, 1);
        });
    });

    describe('generateInsights()', () => {
        test('should generate sleep deficit warning', async () => {
            db.query.mockResolvedValueOnce({
                rows: [{ avg_duration: '300' }] // 5 hours average
            });

            const insights = await module.generateInsights('test-user');

            expect(insights.length).toBeGreaterThan(0);
            expect(insights[0].type).toBe('warning');
            expect(insights[0].title).toBe('Sleep Deficit');
        });

        test('should generate achievement for good sleep', async () => {
            db.query.mockResolvedValueOnce({
                rows: [{ avg_duration: '450' }] // 7.5 hours average
            });

            const insights = await module.generateInsights('test-user');

            expect(insights.length).toBeGreaterThan(0);
            expect(insights[0].type).toBe('achievement');
            expect(insights[0].title).toBe('Great Sleep Routine');
        });
    });

    describe('estimateSleepQuality()', () => {
        test('should estimate good sleep quality', () => {
            expect(module.estimateSleepQuality({ note: 'great sleep' })).toBe('good');
            expect(module.estimateSleepQuality({ quality: 'refreshed' })).toBe('good');
        });

        test('should estimate poor sleep quality', () => {
            expect(module.estimateSleepQuality({ note: 'poor sleep - restless' })).toBe('poor');
        });

        test('should default to average', () => {
            expect(module.estimateSleepQuality({ note: 'regular sleep' })).toBe('average');
        });
    });

    describe('checkVitalAlerts()', () => {
        test('should alert for high blood pressure', () => {
            const alerts = module.checkVitalAlerts({ bloodPressure: '160/100' });

            expect(alerts.length).toBeGreaterThan(0);
            expect(alerts[0].type).toBe('warning');
            expect(alerts[0].message).toContain('High blood pressure');
        });

        test('should alert for elevated heart rate', () => {
            const alerts = module.checkVitalAlerts({ heartRate: 110 });

            expect(alerts.length).toBeGreaterThan(0);
            expect(alerts[0].type).toBe('info');
        });

        test('should return empty alerts for normal vitals', () => {
            const alerts = module.checkVitalAlerts({
                bloodPressure: '120/80',
                heartRate: 70
            });

            expect(alerts.length).toBe(0);
        });
    });
});
