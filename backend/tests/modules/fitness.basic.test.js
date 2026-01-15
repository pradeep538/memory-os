import { describe, it, expect, beforeEach } from '@jest/globals';
import FitnessModule from '../../src/modules/fitness/fitness.module.js';

describe('FitnessModule - Basic Tests', () => {
    let module;

    beforeEach(() => {
        module = new FitnessModule();
    });

    describe('Module Initialization', () => {
        it('should initialize with correct metadata', () => {
            expect(module.category).toBe('fitness');
            expect(module.name).toBe('Fitness & Workouts');
            expect(module.version).toBe('1.0.0');
        });

        it('should have correct capabilities', () => {
            const metadata = module.getMetadata();
            expect(metadata.capabilities.processMemory).toBe(true);
            expect(metadata.capabilities.generateInsights).toBe(true);
            expect(metadata.capabilities.workoutTracking).toBe(true);
            expect(metadata.capabilities.splitDetection).toBe(true);
        });
    });

    describe('detectWorkoutType()', () => {
        it('should detect strength training', () => {
            expect(module.detectWorkoutType('chest workout')).toBe('strength');
            expect(module.detectWorkoutType('bench press 3x8')).toBe('strength');
            expect(module.detectWorkoutType('leg day - squats')).toBe('strength');
        });

        it('should detect cardio', () => {
            expect(module.detectWorkoutType('running 5k')).toBe('cardio');
            expect(module.detectWorkoutType('cycling for 30 minutes')).toBe('cardio');
        });

        it('should detect flexibility', () => {
            expect(module.detectWorkoutType('yoga class')).toBe('flexibility');
        });

        it('should detect sports', () => {
            expect(module.detectWorkoutType('basketball game')).toBe('sports');
        });
    });

    describe('categorizeForSplit()', () => {
        it('should categorize push exercises', () => {
            expect(module.categorizeForSplit('chest workout')).toBe('push');
            expect(module.categorizeForSplit('shoulder press')).toBe('push');
        });

        it('should categorize pull exercises', () => {
            expect(module.categorizeForSplit('back day - rows')).toBe('pull');
            expect(module.categorizeForSplit('bicep curls')).toBe('pull');
        });

        it('should categorize leg exercises', () => {
            expect(module.categorizeForSplit('leg day - squats')).toBe('legs');
        });
    });

    describe('isPPLSequence()', () => {
        it('should recognize valid PPL sequences', () => {
            expect(module.isPPLSequence(['push', 'pull', 'legs'])).toBe(true);
            expect(module.isPPLSequence(['pull', 'legs', 'push'])).toBe(true);
        });

        it('should reject invalid sequences', () => {
            expect(module.isPPLSequence(['push', 'push', 'legs'])).toBe(false);
        });
    });
});
