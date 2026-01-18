import db from '../../db/index.js';

/**
 * User Engagement Service
 * Tracks user activity, streaks, and engagement metrics
 */
class EngagementService {
    /**
     * Get engagement data for a user
     */
    async getUserEngagement(userId) {
        const query = `
            SELECT * FROM user_engagement
            WHERE user_id = $1
        `;

        const result = await db.query(query, [userId]);

        if (result.rows.length === 0) {
            // Create initial engagement record
            return this.initializeEngagement(userId);
        }

        return result.rows[0];
    }

    /**
     * Initialize engagement tracking for new user
     */
    async initializeEngagement(userId) {
        const query = `
            INSERT INTO user_engagement (
                user_id, total_events, current_logging_streak,
                longest_logging_streak, days_since_last_log, engagement_score
            )
            VALUES ($1, 0, 0, 0, 0, 0)
            RETURNING *
        `;

        const result = await db.query(query, [userId]);
        return result.rows[0];
    }

    /**
     * Calculate engagement score based on multiple factors
     */
    async calculateEngagementScore(userId) {
        const query = `
            SELECT 
                ue.total_events,
                ue.current_logging_streak,
                ue.days_since_last_log,
                ue.last_activity_date,
                COUNT(DISTINCT DATE(mu.created_at)) as active_days_last_30,
                COUNT(mu.id) as memories_last_30,
                AVG(CASE WHEN h.completion_rate IS NOT NULL THEN h.completion_rate ELSE 0 END) as avg_habit_completion
            FROM user_engagement ue
            LEFT JOIN memory_units mu ON mu.user_id = ue.user_id 
                AND mu.created_at >= NOW() - INTERVAL '30 days'
            LEFT JOIN habits h ON h.user_id = ue.user_id AND h.status = 'active'
            WHERE ue.user_id = $1
            GROUP BY ue.user_id, ue.total_events, ue.current_logging_streak, 
                     ue.days_since_last_log, ue.last_activity_date
        `;

        const result = await db.query(query, [userId]);

        if (result.rows.length === 0) {
            return 0;
        }

        const data = result.rows[0];

        // Scoring algorithm
        let score = 0;

        // Active days in last 30 (40 points max)
        score += Math.min(40, (parseInt(data.active_days_last_30) / 30) * 40);

        // Current streak (30 points max)
        score += Math.min(30, parseInt(data.current_logging_streak) * 2);

        // Memories in last 30 days (20 points max)
        score += Math.min(20, (parseInt(data.memories_last_30) / 60) * 20);

        // Habit completion rate (10 points max)
        score += (parseFloat(data.avg_habit_completion) || 0) * 0.1;

        // Penalty for inactivity
        const daysSince = parseInt(data.days_since_last_log);
        if (daysSince > 0) {
            score = score * Math.max(0.5, 1 - (daysSince * 0.05));
        }

        return Math.round(score);
    }

    /**
     * Update engagement score
     */
    async updateEngagementScore(userId) {
        const score = await this.calculateEngagementScore(userId);

        const query = `
            UPDATE user_engagement
            SET engagement_score = $1, updated_at = NOW()
            WHERE user_id = $2
            RETURNING *
        `;

        const result = await db.query(query, [score, userId]);
        return result.rows[0];
    }

    /**
     * Get engagement analytics
     */
    async getEngagementAnalytics(userId, days = 30) {
        const query = `
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as memory_count,
                COUNT(DISTINCT category) as categories_used
            FROM memory_units
            WHERE user_id = $1
              AND created_at >= NOW() - INTERVAL '${days} days'
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `;

        const result = await db.query(query, [userId]);

        return {
            daily_activity: result.rows,
            total_days: result.rows.length,
            total_memories: result.rows.reduce((sum, row) => sum + parseInt(row.memory_count), 0),
            avg_memories_per_day: result.rows.length > 0
                ? Math.round(result.rows.reduce((sum, row) => sum + parseInt(row.memory_count), 0) / result.rows.length)
                : 0
        };
    }

    /**
     * Detect at-risk users (drop-off prediction)
     */
    async detectAtRiskUsers(threshold = 30) {
        const query = `
            SELECT 
                user_id,
                days_since_last_log,
                current_logging_streak,
                engagement_score,
                last_activity_date
            FROM user_engagement
            WHERE engagement_score < $1
              AND days_since_last_log > 1
            ORDER BY engagement_score ASC, days_since_last_log DESC
            LIMIT 100
        `;

        const result = await db.query(query, [threshold]);
        return result.rows;
    }

    /**
     * Get streak history
     */
    async getStreakHistory(userId) {
        const engagement = await this.getUserEngagement(userId);

        // Get daily activity for visual representation
        const query = `
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as count
            FROM memory_units
            WHERE user_id = $1
              AND created_at >= NOW() - INTERVAL '90 days'
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `;

        const result = await db.query(query, [userId]);

        return {
            current_streak: engagement.current_logging_streak,
            longest_streak: engagement.longest_logging_streak,
            last_activity: engagement.last_activity_date,
            days_since_last: engagement.days_since_last_log,
            activity_calendar: result.rows
        };
    }

    /**
     * Get engagement leaderboard (for gamification)
     */
    async getLeaderboard(limit = 10) {
        const query = `
            SELECT 
                user_id,
                engagement_score,
                current_logging_streak,
                total_events
            FROM user_engagement
            WHERE engagement_score > 0
            ORDER BY engagement_score DESC, current_logging_streak DESC
            LIMIT $1
        `;

        const result = await db.query(query, [limit]);
        return result.rows;
    }

    /**
     * Get engagement milestones for a user
     */
    async getMilestones(userId) {
        const engagement = await this.getUserEngagement(userId);

        const milestones = {
            achieved: [],
            next: []
        };

        // Define milestones
        const streakMilestones = [3, 7, 14, 21, 30, 60, 90, 180, 365];
        const eventMilestones = [10, 50, 100, 500, 1000, 5000];

        // Check streak milestones
        const currentStreak = parseInt(engagement.current_logging_streak);
        const longestStreak = parseInt(engagement.longest_logging_streak);

        streakMilestones.forEach(milestone => {
            if (longestStreak >= milestone) {
                milestones.achieved.push({
                    type: 'streak',
                    value: milestone,
                    name: `${milestone}-Day Streak`,
                    achieved_at: engagement.updated_at
                });
            } else if (currentStreak < milestone && milestones.next.length < 3) {
                milestones.next.push({
                    type: 'streak',
                    value: milestone,
                    name: `${milestone}-Day Streak`,
                    progress: currentStreak,
                    remaining: milestone - currentStreak
                });
            }
        });

        // Check event milestones
        const totalEvents = parseInt(engagement.total_events);

        eventMilestones.forEach(milestone => {
            if (totalEvents >= milestone) {
                milestones.achieved.push({
                    type: 'events',
                    value: milestone,
                    name: `${milestone} Memories`,
                    achieved_at: engagement.updated_at
                });
            } else if (milestones.next.length < 5) {
                milestones.next.push({
                    type: 'events',
                    value: milestone,
                    name: `${milestone} Memories`,
                    progress: totalEvents,
                    remaining: milestone - totalEvents
                });
            }
        });

        return milestones;
    }

    /**
     * Get comprehensive engagement summary
     */
    async getEngagementSummary(userId) {
        const [engagement, analytics, streaks, milestones, categories] = await Promise.all([
            this.getUserEngagement(userId),
            this.getEngagementAnalytics(userId, 30),
            this.getStreakHistory(userId),
            this.getMilestones(userId),
            this.getCategoryBreakdown(userId)
        ]);

        // Update score
        const updatedEngagement = await this.updateEngagementScore(userId);

        return {
            engagement_score: updatedEngagement.engagement_score,
            trend: 'increasing', // Todo: Calculate real trend
            risk_level: 'none',
            is_at_risk: false,
            components: {
                recency: 80,
                frequency: 100,
                streak: 20,
                growth: 100
            },
            stats: {
                days_since_last: streaks.days_since_last,
                events_7d: analytics.total_memories, // Approx
                events_30d: analytics.total_memories,
                current_streak: streaks.current_streak
            },
            // Extended Data for Detail Screen
            daily_data: analytics.daily_activity.map(d => ({
                date: d.date,
                score: Math.min(100, parseInt(d.memory_count) * 10), // Mock daily score based on volume
                events: parseInt(d.memory_count)
            })),
            category_breakdown: categories,
            tips: []
        };
    }

    /**
     * Get category breakdown for last 30 days
     */
    async getCategoryBreakdown(userId) {
        const query = `
            SELECT category, COUNT(*) as count
            FROM memory_units
            WHERE user_id = $1
            AND created_at >= NOW() - INTERVAL '30 days'
            GROUP BY category
        `;
        const result = await db.query(query, [userId]);

        const breakdown = {};
        let total = 0;
        result.rows.forEach(row => {
            const count = parseInt(row.count);
            breakdown[row.category] = count;
            total += count;
        });

        // Convert to percentages? Or keep raw counts? 
        // Frontend handles ints, but let's check model. 
        // Frontend uses values directly for progress bar.
        // Let's return percentages for now as that's what UI often expects, 
        // OR raw counts if UI calculates it. 
        // Looking at UI: percent = (entry.value as num).toDouble(); 
        // So UI expects explicit percentage (0-100).

        if (total === 0) return {};

        const percentages = {};
        for (const [cat, count] of Object.entries(breakdown)) {
            percentages[cat] = Math.round((count / total) * 100);
        }
        return percentages;
    }

    /**
     * Get engagement status label
     */
    getEngagementStatus(score) {
        if (score >= 80) return 'Highly Engaged';
        if (score >= 60) return 'Engaged';
        if (score >= 40) return 'Moderately Engaged';
        if (score >= 20) return 'At Risk';
        return 'Inactive';
    }
}

export default new EngagementService();
