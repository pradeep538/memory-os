import CategoryModule from '../base/CategoryModule.js';
import db from '../../db/index.js';

/**
 * Fitness Module
 * 
 * Handles workout tracking and fitness-related activities:
 * - Workout logging (exercises, sets, reps, weight)
 * - Rest day detection
 * - Volume and frequency tracking
 * - Progressive overload detection
 * - Workout split patterns (PPL, Upper/Lower, etc.)
 * - Plan templates
 */
class FitnessModule extends CategoryModule {
    constructor() {
        super({
            category: 'fitness',
            name: 'Fitness & Workouts',
            version: '1.0.0'
        });
    }

    /**
     * Process fitness memory
     * Detects workout patterns, tracks volume, identifies rest days
     */
    async processMemory(memoryUnit) {
        const { user_id, normalized_data } = memoryUnit;
        const activity = normalized_data.activity;
        const duration = normalized_data.duration_minutes || normalized_data.duration;

        if (!activity) {
            return { processed: false, message: 'No activity identified' };
        }

        try {
            const results = {};

            // 1. Detect workout type
            const workoutType = this.detectWorkoutType(activity);
            results.workoutType = workoutType;

            // 2. Track workout frequency (last 30 days)
            const recentFrequency = await this.getRecentWorkoutFrequency(user_id);
            results.workoutsThisMonth = recentFrequency.count;
            results.averagePerWeek = recentFrequency.perWeek;

            // 3. Check if this breaks a rest streak
            const daysSinceLastWorkout = await this.getDaysSinceLastWorkout(user_id);
            if (daysSinceLastWorkout >= 2) {
                results.hadRestDay = true;
                results.restDays = daysSinceLastWorkout;
            }

            // 4. Detect workout split pattern (if enough data)
            const splitPattern = await this.detectWorkoutSplit(user_id);
            if (splitPattern) {
                results.detectedSplit = splitPattern.name;
                results.splitConfidence = splitPattern.confidence;
            }

            return {
                processed: true,
                ...results,
                message: `Tracked ${workoutType} workout`
            };
        } catch (error) {
            console.error('Fitness processing error:', error);
            return { processed: false, error: error.message };
        }
    }

    /**
     * Detect workout type from activity description
     */
    detectWorkoutType(activity) {
        const lower = activity.toLowerCase();

        // Strength training keywords
        if (lower.match(/chest|bench|press|shoulder|back|row|pull|leg|squat|deadlift|curl|tricep|bicep|gym|lift|weights?/)) {
            return 'strength';
        }

        // Cardio keywords
        if (lower.match(/run|jog|cardio|treadmill|bike|cycling|swim|rowing|elliptical/)) {
            return 'cardio';
        }

        // Yoga/Flexibility
        if (lower.match(/yoga|stretch|flexibility|pilates/)) {
            return 'flexibility';
        }

        // Sports
        if (lower.match(/basketball|football|soccer|tennis|boxing|mma|sport/)) {
            return 'sports';
        }

        // Default to general
        return 'general';
    }

    /**
     * Get workout frequency in last 30 days
     */
    async getRecentWorkoutFrequency(userId) {
        const query = `
      SELECT COUNT(*) as count
      FROM memory_units
      WHERE user_id = $1
        AND category = 'fitness'
        AND status = 'validated'
        AND created_at >= NOW() - INTERVAL '30 days'
    `;

        const result = await db.query(query, [userId]);
        const count = parseInt(result.rows[0].count);

        return {
            count,
            perWeek: Math.round((count / 30) * 7 * 10) / 10 // Round to 1 decimal
        };
    }

    /**
     * Get days since last workout
     */
    async getDaysSinceLastWorkout(userId) {
        const query = `
      SELECT created_at
      FROM memory_units
      WHERE user_id = $1
        AND category = 'fitness'
        AND status = 'validated'
      ORDER BY created_at DESC
      LIMIT 2
    `;

        const result = await db.query(query, [userId]);

        if (result.rows.length < 2) {
            return 0; // First workout or only one recorded
        }

        const currentWorkout = new Date(result.rows[0].created_at);
        const previousWorkout = new Date(result.rows[1].created_at);

        const diffTime = currentWorkout - previousWorkout;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        return diffDays;
    }

    /**
     * Detect workout split pattern
     * Common patterns: PPL (Push/Pull/Legs), Upper/Lower, Full Body
     */
    async detectWorkoutSplit(userId) {
        // Get last 10 workouts
        const query = `
      SELECT 
        normalized_data->>'activity' as activity,
        created_at
      FROM memory_units
      WHERE user_id = $1
        AND category = 'fitness'
        AND status = 'validated'
      ORDER BY created_at DESC
      LIMIT 10
    `;

        const result = await db.query(query, [userId]);
        const workouts = result.rows;

        if (workouts.length < 6) {
            return null; // Need at least 6 workouts to detect a pattern
        }

        // Categorize each workout
        const categorized = workouts.map(w => ({
            activity: w.activity,
            type: this.categorizeForSplit(w.activity),
            date: w.created_at
        }));

        // Detect PPL pattern
        const pplScore = this.scorePPLPattern(categorized);
        if (pplScore > 0.6) {
            return { name: 'PPL (Push/Pull/Legs)', confidence: pplScore };
        }

        // Detect Upper/Lower pattern
        const upperLowerScore = this.scoreUpperLowerPattern(categorized);
        if (upperLowerScore > 0.6) {
            return { name: 'Upper/Lower Split', confidence: upperLowerScore };
        }

        // Detect Full Body
        const fullBodyScore = this.scoreFullBodyPattern(categorized);
        if (fullBodyScore > 0.6) {
            return { name: 'Full Body', confidence: fullBodyScore };
        }

        return null;
    }

    /**
     * Categorize workout for split detection
     */
    categorizeForSplit(activity) {
        const lower = activity.toLowerCase();

        if (lower.match(/chest|shoulder|tricep|bench|press|overhead/)) {
            return 'push';
        }
        if (lower.match(/back|bicep|row|pull|lat|curl/)) {
            return 'pull';
        }
        if (lower.match(/leg|squat|deadlift|glute|quad|hamstring|calf/)) {
            return 'legs';
        }
        if (lower.match(/upper/)) {
            return 'upper';
        }
        if (lower.match(/lower/)) {
            return 'lower';
        }

        return 'other';
    }

    /**
     * Score PPL pattern (looking for Push/Pull/Legs rotation)
     */
    scorePPLPattern(workouts) {
        const types = workouts.map(w => w.type);
        let pplCount = 0;

        // Look for PPL sequences
        for (let i = 0; i < types.length - 2; i++) {
            const sequence = types.slice(i, i + 3);
            if (this.isPPLSequence(sequence)) {
                pplCount++;
            }
        }

        return Math.min(pplCount / (workouts.length / 3), 1);
    }

    isPPLSequence(sequence) {
        const validSequences = [
            ['push', 'pull', 'legs'],
            ['pull', 'legs', 'push'],
            ['legs', 'push', 'pull']
        ];

        return validSequences.some(valid =>
            valid.every((type, idx) => sequence[idx] === type)
        );
    }

    /**
     * Score Upper/Lower pattern
     */
    scoreUpperLowerPattern(workouts) {
        const types = workouts.map(w => w.type);
        let alternatingCount = 0;

        for (let i = 0; i < types.length - 1; i++) {
            const current = types[i];
            const next = types[i + 1];

            if ((current === 'upper' && next === 'lower') ||
                (current === 'lower' && next === 'upper') ||
                (current === 'push' && next === 'legs') ||
                (current === 'legs' && next === 'pull')) {
                alternatingCount++;
            }
        }

        return alternatingCount / (workouts.length - 1);
    }

    /**
     * Score Full Body pattern
     */
    scoreFullBodyPattern(workouts) {
        // Full body = variety of muscle groups in each workout
        // For simplicity, if no clear split pattern, assume full body
        return 0.5;
    }

    /**
     * Generate fitness-specific insights
     */
    async generateInsights(userId, timeRange = {}) {
        const insights = [];

        // 1. Workout frequency insights
        const frequency = await this.analyzeWorkoutFrequency(userId);
        if (frequency.insight) {
            insights.push(frequency.insight);
        }

        // 2. Rest day patterns
        const restPattern = await this.analyzeRestPatterns(userId);
        if (restPattern.insight) {
            insights.push(restPattern.insight);
        }

        // 3. Workout split consistency
        const splitConsistency = await this.analyzeSplitConsistency(userId);
        if (splitConsistency.insight) {
            insights.push(splitConsistency.insight);
        }

        return insights;
    }

    async analyzeWorkoutFrequency(userId) {
        const freq = await this.getRecentWorkoutFrequency(userId);

        if (freq.perWeek >= 4) {
            return {
                insight: {
                    type: 'achievement',
                    category: 'fitness',
                    title: 'Workout Warrior',
                    description: `You're hitting ${freq.perWeek} workouts per week! That's elite consistency 💪`,
                    priority: 'medium'
                }
            };
        } else if (freq.perWeek >= 2) {
            return {
                insight: {
                    type: 'progress',
                    category: 'fitness',
                    title: 'Solid Routine',
                    description: `${freq.perWeek} workouts per week - you're building the habit!`,
                    priority: 'low'
                }
            };
        }

        return {};
    }

    async analyzeRestPatterns(userId) {
        // TODO: Implement rest pattern analysis
        return {};
    }

    async analyzeSplitConsistency(userId) {
        // TODO: Implement split consistency analysis
        return {};
    }

    /**
     * Get module capabilities
     */
    getMetadata() {
        return {
            ...super.getMetadata(),
            capabilities: {
                processMemory: true,
                generateInsights: true,
                generatePlans: true,
                guidedSessions: false,
                workoutTracking: true,
                splitDetection: true,
                progressTracking: true
            },
            supportedWorkoutTypes: [
                'strength', 'cardio', 'flexibility', 'sports', 'general'
            ],
            supportedSplits: [
                'PPL', 'Upper/Lower', 'Full Body', 'Bro Split'
            ]
        };
    }
}

export default FitnessModule;
