import engagementService from '../../services/engagement/engagementService.js';

/**
 * Engagement Controller
 * Handles HTTP requests for user engagement tracking
 */
class EngagementController {
    /**
     * Get user engagement data
     */
    async getEngagement(request, reply) {
        try {
            const userId = request.userId;

            const engagement = await engagementService.getUserEngagement(userId);

            return {
                success: true,
                data: engagement
            };
        } catch (error) {
            reply.code(500);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get engagement summary with analytics
     */
    async getEngagementSummary(request, reply) {
        try {
            const userId = request.userId;

            const summary = await engagementService.getEngagementSummary(userId);

            return {
                success: true,
                data: summary
            };
        } catch (error) {
            reply.code(500);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get engagement analytics
     */
    async getAnalytics(request, reply) {
        try {
            const userId = request.userId;
            const { days } = request.query;

            const analytics = await engagementService.getEngagementAnalytics(
                userId,
                days ? parseInt(days) : 30
            );

            return {
                success: true,
                data: analytics
            };
        } catch (error) {
            reply.code(500);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get streak history
     */
    async getStreaks(request, reply) {
        try {
            const userId = request.userId;

            const streaks = await engagementService.getStreakHistory(userId);

            return {
                success: true,
                data: streaks
            };
        } catch (error) {
            reply.code(500);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get milestones
     */
    async getMilestones(request, reply) {
        try {
            const userId = request.userId;

            const milestones = await engagementService.getMilestones(userId);

            return {
                success: true,
                data: milestones
            };
        } catch (error) {
            reply.code(500);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get leaderboard
     */
    async getLeaderboard(request, reply) {
        try {
            const { limit } = request.query;

            const leaderboard = await engagementService.getLeaderboard(
                limit ? parseInt(limit) : 10
            );

            return {
                success: true,
                data: leaderboard
            };
        } catch (error) {
            reply.code(500);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Refresh engagement score
     */
    async refreshScore(request, reply) {
        try {
            const userId = request.userId;

            const engagement = await engagementService.updateEngagementScore(userId);

            return {
                success: true,
                data: engagement,
                message: 'Engagement score updated'
            };
        } catch (error) {
            reply.code(500);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get at-risk users (admin only)
     */
    async getAtRiskUsers(request, reply) {
        try {
            const { threshold } = request.query;

            const users = await engagementService.detectAtRiskUsers(
                threshold ? parseInt(threshold) : 30
            );

            return {
                success: true,
                data: users,
                count: users.length
            };
        } catch (error) {
            reply.code(500);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

export default new EngagementController();
