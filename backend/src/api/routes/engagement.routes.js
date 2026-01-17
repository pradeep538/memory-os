
import feedService from '../../services/engagement/feedService.js';
import feedbackService from '../../services/engagement/feedbackService.js';
import analyticsService from '../../services/analytics/analyticsService.js';

export default async function (fastify, opts) {

    // GET /api/v1/feed
    fastify.get('/feed', async (request, reply) => {
        try {
            const feed = await feedService.getFeed(request.userId);
            return {
                success: true,
                data: feed
            };
        } catch (err) {
            request.log.error(err);
            return reply.code(500).send({ success: false, error: err.message });
        }
    });

    // POST /api/v1/feed/:id/read
    fastify.post('/feed/:id/read', async (request, reply) => {
        try {
            const { id } = request.params;
            await feedService.markRead(id, request.userId);
            return { success: true };
        } catch (err) {
            request.log.error(err);
            return reply.code(500).send({ success: false, error: err.message });
        }
    });

    // GET /api/v1/feedback/latest (Immediate Feedback Polling)
    fastify.get('/feedback/latest', async (request, reply) => {
        try {
            const feedback = await feedbackService.getLatest(request.userId);
            return {
                success: true,
                data: feedback // null if no recent feedback
            };
        } catch (err) {
            request.log.error(err);
            return reply.code(500).send({ success: false, error: err.message });
        }
    });

    // GET /api/v1/engagement/consistency (Proxy to Analytics Service)
    fastify.get('/consistency', async (request, reply) => {
        try {
            console.log(`[Proxy] Fetching consistency for ${request.userId}...`);
            const consistency = await analyticsService.getConsistency(request.userId);
            console.log(`[Proxy] Consistency Result:`, JSON.stringify(consistency));

            // Analytics service returns { success: true, data: { ... } }
            // We should strip the wrapper or just return consistency directly to avoid double wrapping
            if (consistency && consistency.success && consistency.data) {
                return {
                    success: true,
                    data: consistency.data
                };
            }

            // Fallback if structure is different
            return consistency;
        } catch (err) {
            console.error('[Proxy] Consistency Fetch Failed:', err.message);
            // Fallback for demo/dev if analytics service is down
            return {
                success: true,
                data: {
                    level: 'Novice',
                    score: 0,
                    trend: 'stable',
                    engagement: { currentLoggingStreak: 0 }
                }
            };
        }
    });
}
