import CategoryModule from '../base/CategoryModule.js';
import db from '../../db/index.js';

/**
 * Mindfulness Module
 * 
 * Handles mindfulness and mental wellness:
 * - Meditation sessions
 * - Mood tracking
 * - Gratitude journaling
 * - Reflection & self-awareness
 * - Stress & anxiety management
 */
class MindfulnessModule extends CategoryModule {
    constructor() {
        super({
            category: 'mindfulness',
            name: 'Mindfulness & Mental Wellness',
            version: '1.0.0'
        });
    }

    /**
     * Process mindfulness memory
     */
    async processMemory(memoryUnit) {
        const { user_id, normalized_data } = memoryUnit;

        try {
            const results = {};

            // Detect mindfulness type
            const mindfulnessType = this.detectMindfulnessType(normalized_data);
            results.mindfulnessType = mindfulnessType;

            // Process based on type
            switch (mindfulnessType) {
                case 'meditation':
                    results.meditationData = await this.processMeditation(user_id, normalized_data);
                    break;
                case 'mood':
                    results.moodData = await this.processMood(user_id, normalized_data);
                    break;
                case 'gratitude':
                    results.gratitudeData = await this.processGratitude(user_id, normalized_data);
                    break;
                case 'reflection':
                    results.reflectionData = await this.processReflection(user_id, normalized_data);
                    break;
            }

            // Track streak
            const streak = await this.getMindfulnessStreak(user_id);
            results.currentStreak = streak;

            return {
                processed: true,
                ...results,
                message: `Tracked ${mindfulnessType} practice`
            };
        } catch (error) {
            console.error('Mindfulness processing error:', error);
            return { processed: false, error: error.message };
        }
    }

    /**
     * Detect mindfulness type
     */
    detectMindfulnessType(data) {
        const text = JSON.stringify(data).toLowerCase();

        if (text.match(/meditat|breathwork|mindfulness practice|zen|sitting|vipassana/)) {
            return 'meditation';
        }
        if (text.match(/mood|feeling|emotion|happy|sad|anxious|stressed|calm/)) {
            return 'mood';
        }
        if (text.match(/grateful|thankful|appreciate|gratitude|blessed/)) {
            return 'gratitude';
        }
        if (text.match(/reflect|journal|think|contemplate|self-aware/)) {
            return 'reflection';
        }

        return 'general';
    }

    /**
     * Process meditation session
     */
    async processMeditation(userId, data) {
        const duration = data.duration_minutes || data.duration || 10;
        const technique = data.technique || this.detectMeditationTechnique(data);

        // Get meditation stats
        const stats = await this.getMeditationStats(userId);

        return {
            duration,
            technique,
            totalSessions: stats.count,
            totalMinutes: stats.totalMinutes,
            averageDuration: stats.avgDuration,
            milestone: this.checkMeditationMilestone(stats.totalMinutes)
        };
    }

    /**
     * Process mood entry
     */
    async processMood(userId, data) {
        const mood = {
            type: data.mood || data.feeling || this.detectMood(data),
            intensity: data.intensity || this.estimateIntensity(data),
            triggers: data.triggers || []
        };

        // Analyze mood trends
        const trends = await this.analyzeMoodTrends(userId);
        mood.trend = trends.trend;
        mood.suggestion = this.getMoodSuggestion(mood.type, trends);

        return mood;
    }

    /**
     * Process gratitude entry
     */
    async processGratitude(userId, data) {
        const gratitude = {
            items: data.items || data.gratitude || [],
            count: Array.isArray(data.items) ? data.items.length : 1
        };

        // Track gratitude streak
        const streak = await this.getGratitudeStreak(userId);
        gratitude.streak = streak;

        if (streak >= 21) {
            gratitude.achievement = 'Gratitude habit formed! 🙏';
        }

        return gratitude;
    }

    /**
     * Process reflection entry
     */
    async processReflection(userId, data) {
        return {
            topic: data.topic || 'general',
            depth: this.estimateReflectionDepth(data),
            insights: data.insights || []
        };
    }

    /**
     * Detect meditation technique
     */
    detectMeditationTechnique(data) {
        const text = JSON.stringify(data).toLowerCase();

        if (text.match(/breath|breathing/)) return 'breathwork';
        if (text.match(/body scan/)) return 'body_scan';
        if (text.match(/loving kindness|metta/)) return 'loving_kindness';
        if (text.match(/transcendental|tm/)) return 'transcendental';
        if (text.match(/guided/)) return 'guided';

        return 'mindfulness';
    }

    /**
     * Detect mood from text
     */
    detectMood(data) {
        const text = JSON.stringify(data).toLowerCase();

        if (text.match(/happy|joy|excited|great|wonderful/)) return 'positive';
        if (text.match(/sad|down|depressed|low/)) return 'negative';
        if (text.match(/anxious|worried|stressed|nervous/)) return 'anxious';
        if (text.match(/calm|peaceful|relaxed|content/)) return 'calm';
        if (text.match(/angry|frustrated|irritated/)) return 'frustrated';

        return 'neutral';
    }

    /**
     * Estimate intensity
     */
    estimateIntensity(data) {
        const text = JSON.stringify(data).toLowerCase();

        if (text.match(/very|extremely|really|so|super/)) return 'high';
        if (text.match(/slight|little|bit|somewhat/)) return 'low';

        return 'medium';
    }

    /**
     * Estimate reflection depth
     */
    estimateReflectionDepth(data) {
        const text = JSON.stringify(data);
        const wordCount = text.split(/\s+/).length;

        if (wordCount > 100) return 'deep';
        if (wordCount > 30) return 'moderate';
        return 'brief';
    }

    /**
     * Get meditation statistics
     */
    async getMeditationStats(userId) {
        const query = `
            SELECT 
                COUNT(*) as count,
                SUM((normalized_data->>'duration_minutes')::numeric) as total_minutes,
                AVG((normalized_data->>'duration_minutes')::numeric) as avg_duration
            FROM memory_units
            WHERE user_id = $1
              AND category = 'mindfulness'
              AND normalized_data->>'type' = 'meditation'
        `;

        try {
            const result = await db.query(query, [userId]);
            return {
                count: parseInt(result.rows[0].count) || 0,
                totalMinutes: parseFloat(result.rows[0].total_minutes) || 0,
                avgDuration: parseFloat(result.rows[0].avg_duration) || 0
            };
        } catch (error) {
            return { count: 0, totalMinutes: 0, avgDuration: 0 };
        }
    }

    /**
     * Check meditation milestones
     */
    checkMeditationMilestone(totalMinutes) {
        if (totalMinutes >= 1000) return '1000+ minutes - Master meditator! 🧘';
        if (totalMinutes >= 500) return '500+ minutes - Advanced practitioner';
        if (totalMinutes >= 100) return '100+ minutes - Building consistency';
        if (totalMinutes >= 21) return '21+ minutes - Great start!';
        return null;
    }

    /**
     * Analyze mood trends
     */
    async analyzeMoodTrends(userId) {
        const query = `
            SELECT normalized_data->>'mood' as mood,
                   created_at
            FROM memory_units
            WHERE user_id = $1
              AND category = 'mindfulness'
              AND normalized_data->>'type' = 'mood'
              AND created_at >= NOW() - INTERVAL '7 days'
            ORDER BY created_at DESC
            LIMIT 10
        `;

        try {
            const result = await db.query(query, [userId]);
            const moods = result.rows.map(r => r.mood);

            // Simple trend analysis
            const positiveCount = moods.filter(m => m === 'positive' || m === 'calm').length;
            const negativeCount = moods.filter(m => m === 'negative' || m === 'anxious' || m === 'frustrated').length;

            if (positiveCount > negativeCount * 2) return { trend: 'improving' };
            if (negativeCount > positiveCount * 2) return { trend: 'declining' };
            return { trend: 'stable' };
        } catch (error) {
            return { trend: 'unknown' };
        }
    }

    /**
     * Get mood-based suggestion
     */
    getMoodSuggestion(mood, trends) {
        if (mood === 'anxious' || mood === 'stressed') {
            return 'Try a 5-minute breathing exercise to calm your mind';
        }
        if (mood === 'negative' && trends.trend === 'declining') {
            return 'Consider reaching out to a friend or practicing gratitude';
        }
        if (mood === 'positive') {
            return 'Great! Share some gratitude to amplify the positivity';
        }
        return null;
    }

    /**
     * Get mindfulness streak
     */
    async getMindfulnessStreak(userId) {
        const query = `
            SELECT DISTINCT DATE(created_at) as practice_date
            FROM memory_units
            WHERE user_id = $1
              AND category = 'mindfulness'
            ORDER BY practice_date DESC
        `;

        try {
            const result = await db.query(query, [userId]);
            const dates = result.rows.map(r => new Date(r.practice_date));

            let streak = 0;
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            for (let i = 0; i < dates.length; i++) {
                const expectedDate = new Date(today);
                expectedDate.setDate(today.getDate() - i);
                expectedDate.setHours(0, 0, 0, 0);

                const practiceDate = new Date(dates[i]);
                practiceDate.setHours(0, 0, 0, 0);

                if (practiceDate.getTime() === expectedDate.getTime()) {
                    streak++;
                } else {
                    break;
                }
            }

            return streak;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Get gratitude streak
     */
    async getGratitudeStreak(userId) {
        // Similar to mindfulness streak but filtered for gratitude
        const query = `
            SELECT DISTINCT DATE(created_at) as practice_date
            FROM memory_units
            WHERE user_id = $1
              AND category = 'mindfulness'
              AND normalized_data->>'type' = 'gratitude'
            ORDER BY practice_date DESC
        `;

        try {
            const result = await db.query(query, [userId]);
            // Calculate streak same way as mindfulness
            const dates = result.rows.map(r => new Date(r.practice_date));
            let streak = 0;
            const today = new Date();

            for (let i = 0; i < dates.length; i++) {
                const expectedDate = new Date(today);
                expectedDate.setDate(today.getDate() - i);

                if (dates[i].toDateString() === expectedDate.toDateString()) {
                    streak++;
                } else {
                    break;
                }
            }

            return streak;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Generate insights
     */
    async generateInsights(userId, timeRange = {}) {
        const insights = [];

        // Meditation consistency
        const meditationInsight = await this.analyzeMeditationConsistency(userId);
        if (meditationInsight.insight) {
            insights.push(meditationInsight.insight);
        }

        // Mood patterns
        const moodInsight = await this.analyzeMoodPatterns(userId);
        if (moodInsight.insight) {
            insights.push(moodInsight.insight);
        }

        return insights;
    }

    async analyzeMeditationConsistency(userId) {
        const stats = await this.getMeditationStats(userId);

        if (stats.count >= 21) {
            return {
                insight: {
                    type: 'achievement',
                    category: 'mindfulness',
                    title: 'Meditation Habit Formed',
                    description: `${stats.count} sessions completed! You've established a consistent practice 🧘`,
                    priority: 'medium'
                }
            };
        }

        return {};
    }

    async analyzeMoodPatterns(userId) {
        const trends = await this.analyzeMoodTrends(userId);

        if (trends.trend === 'declining') {
            return {
                insight: {
                    type: 'warning',
                    category: 'mindfulness',
                    title: 'Mood Trend Alert',
                    description: 'Your mood has been lower recently. Consider meditation or talking to someone.',
                    priority: 'high'
                }
            };
        }

        return {};
    }

    /**
     * Get module metadata
     */
    getMetadata() {
        return {
            ...super.getMetadata(),
            capabilities: {
                processMemory: true,
                generateInsights: true,
                trackMeditation: true,
                trackMood: true,
                trackGratitude: true,
                trackReflection: true
            },
            supportedTypes: [
                'meditation', 'mood', 'gratitude', 'reflection', 'breathwork'
            ]
        };
    }
}

export default MindfulnessModule;
