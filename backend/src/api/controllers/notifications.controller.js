import schedulerService from '../../services/notifications/schedulerService.js';
import NotificationModel from '../../models/notification.model.js';
import PatternModel from '../../models/pattern.model.js';

class NotificationsController {
    /**
     * Get user's notifications
     * GET /api/v1/notifications
     */
    async getNotifications(request, reply) {
        try {
            const { limit } = request.query;

            
            const userId = request.userId;

            const notifications = await NotificationModel.getRecentByUser(
                userId,
                limit ? parseInt(limit) : 20
            );

            reply.send({
                success: true,
                data: notifications,
                count: notifications.length
            });
        } catch (error) {
            request.log.error(error);
            reply.code(500).send({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Reveal insight (when user taps notification)
     * GET /api/v1/notifications/:id/reveal
     */
    async revealInsight(request, reply) {
        try {
            const { id } = request.params;

            
            const userId = request.userId;

            // Get notification
            const notifications = await NotificationModel.getRecentByUser(userId, 100);
            const notification = notifications.find(n => n.id === id);

            if (!notification) {
                return reply.code(404).send({
                    success: false,
                    error: 'Notification not found'
                });
            }

            // Get the actual insight
            const insightId = notification.metadata?.insight_id;

            if (!insightId) {
                return reply.code(400).send({
                    success: false,
                    error: 'This notification has no insight to reveal'
                });
            }

            // TODO: Get pattern from database
            const patterns = await PatternModel.findByUser(userId);
            const pattern = patterns.find(p => p.id === insightId);

            if (!pattern) {
                return reply.code(404).send({
                    success: false,
                    error: 'Insight not found'
                });
            }

            reply.send({
                success: true,
                data: {
                    notification,
                    insight: {
                        id: pattern.id,
                        type: pattern.pattern_type,
                        category: pattern.category,
                        insight: pattern.description, // The revealed answer!
                        confidence: parseFloat(pattern.confidence_score)
                    }
                }
            });
        } catch (error) {
            request.log.error(error);
            reply.code(500).send({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Trigger job manually (for testing)
     * POST /api/v1/notifications/trigger/:jobName
     */
    async triggerJob(request, reply) {
        try {
            const { jobName } = request.params;

            
            const userId = request.userId;

            const result = await schedulerService.runNow(jobName, userId);

            reply.send({
                success: true,
                data: result,
                message: `Job '${jobName}' triggered successfully`
            });
        } catch (error) {
            request.log.error(error);
            reply.code(500).send({
                success: false,
                error: error.message
            });
        }
    }
}

export default new NotificationsController();
