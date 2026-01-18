import config from '../../config/index.js';
import llmService from '../understanding/llmService.js';
import PatternModel from '../../models/pattern.model.js';

class InsightsService {
    /**
     * Fetch patterns from Python analytics service
     */
    async fetchPatternsFromAnalytics(userId) {
        const analyticsUrl = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:8001';

        try {
            const response = await fetch(`${analyticsUrl}/api/v1/patterns/${userId}`);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Analytics Error Body:', errorText);
                throw new Error(`Analytics service error: ${response.statusText} - ${errorText}`);
            }

            const data = await response.json();
            return data.data; // { frequency_patterns: [...], time_patterns: [...] }
        } catch (error) {
            console.error('Failed to fetch from analytics:', error);
            return { frequency_patterns: [], time_patterns: [] };
        }
    }

    /**
     * Convert Python patterns to natural language insights using LLM
     */
    async generateInsightFromPattern(pattern) {
        const prompt = `
You are a personal AI assistant. Convert this statistical pattern into a friendly, encouraging insight.

Pattern Type: ${pattern.pattern_type}
Category: ${pattern.category}
Activity: ${pattern.activity || 'N/A'}
Data: ${JSON.stringify(pattern)}

Generate a single short sentence (max 20 words) that:
- Sounds personal and encouraging
- Highlights the pattern naturally
- Feels like a friend noticing something about you

Examples:
- "You're crushing it with workouts - 4 times a week! That's consistency 💪"
- "Mornings are your meditation sweet spot - you nail it at 6 AM ✨"
- "Your gym routine is rock solid - every other day like clockwork 🔥"

Now generate for the given pattern. Return ONLY the insight text, nothing else.
`;

        try {
            const insight = await llmService.generateStructuredResponse(prompt);
            return insight || pattern.description; // Fallback to raw description
        } catch (error) {
            console.error('LLM insight generation failed:', error);
            return pattern.description;
        }
    }

    /**
     * Get insights for user (with caching)
     */
    async getUserInsights(userId, forceRefresh = false) {
        // 1. Check if we have cached patterns (less than 24 hours old)
        if (!forceRefresh) {
            const cached = await PatternModel.findByUser(userId);

            const recentCached = cached.filter(p => {
                const ageHours = (Date.now() - new Date(p.last_validated_at).getTime()) / (1000 * 60 * 60);
                return ageHours < 24;
            });

            if (recentCached.length > 0) {
                console.log(`Using ${recentCached.length} cached patterns for user ${userId}`);
                return recentCached.map(p => ({
                    id: p.id,
                    type: p.pattern_type,
                    category: p.category,
                    insight: p.insight || p.description,
                    description: p.description,
                    confidence: parseFloat(p.confidence_score),
                    isNew: false,
                    lastUpdated: p.last_validated_at
                }));
            }
        }

        // 2. Fetch fresh patterns from Python analytics
        console.log(`Fetching fresh patterns from Python service for user ${userId}`);
        const analyticsPatterns = await this.fetchPatternsFromAnalytics(userId);

        // 3. Combine all pattern types
        const allPatterns = [
            ...analyticsPatterns.frequency_patterns || [],
            ...analyticsPatterns.time_patterns || []
        ];

        if (allPatterns.length === 0) {
            return [];
        }

        // 4. Generate natural language insights using LLM
        const insightsPromises = allPatterns.map(async pattern => {
            const naturalLanguage = await this.generateInsightFromPattern(pattern);

            // 5. Store in database for caching
            const storedPattern = await PatternModel.upsert({
                userId,
                category: pattern.category,
                patternType: pattern.pattern_type,
                description: pattern.description || '',
                insight: naturalLanguage,
                supportingMemories: [],
                confidenceScore: pattern.confidence || 0.7,
                isActionable: false
            });

            return {
                id: storedPattern.id,
                type: pattern.pattern_type,
                category: pattern.category,
                insight: naturalLanguage,
                description: pattern.description,
                confidence: pattern.confidence || 0.7,
                rawData: pattern,
                isNew: true,
                lastUpdated: storedPattern.last_validated_at
            };
        });

        const insights = await Promise.all(insightsPromises);

        // 6. Clean up old patterns
        await PatternModel.cleanupStale(userId, 30);

        return insights.sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * Get single category insights
     */
    async getCategoryInsights(userId, category) {
        const allInsights = await this.getUserInsights(userId);
        return allInsights.filter(i => i.category === category);
    }

    /**
     * Force refresh insights (bypass cache)
     */
    async refreshInsights(userId) {
        return this.getUserInsights(userId, true);
    }

    /**
     * Get patterns for user (raw pattern data)
     */
    async getPatterns(userId) {
        // Get patterns from database
        const patterns = await PatternModel.findByUser(userId);

        // If no patterns, try to fetch from analytics
        if (patterns.length === 0) {
            const analyticsPatterns = await this.fetchPatternsFromAnalytics(userId);

            const allPatterns = [
                ...(analyticsPatterns.frequency_patterns || []).map(p => ({
                    id: `freq_${p.activity}_${p.category}`,
                    pattern_type: p.pattern_type,
                    category: p.category,
                    description: p.description,
                    confidence_score: p.confidence,
                    frequency: p.frequency_per_week ? `${p.frequency_per_week}x per week` : null,
                    trend: null
                })),
                ...(analyticsPatterns.time_patterns || []).map(p => ({
                    id: `time_${p.activity}_${p.category}`,
                    pattern_type: p.pattern_type,
                    category: p.category,
                    description: p.description,
                    confidence_score: p.confidence,
                    frequency: null,
                    trend: `Peak at ${p.peak_hour}:00`
                }))
            ];

            return allPatterns;
        }

        return patterns.map(p => ({
            id: p.id,
            pattern_type: p.pattern_type,
            category: p.category,
            description: p.description,
            insight: p.insight,
            confidence_score: parseFloat(p.confidence_score),
            frequency: null,
            trend: null,
            created_at: p.created_at,
            last_validated_at: p.last_validated_at
        }));
    }
}

export default new InsightsService();
