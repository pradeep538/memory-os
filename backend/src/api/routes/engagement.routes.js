
import feedService from '../../services/engagement/feedService.js';
import feedbackService from '../../services/engagement/feedbackService.js';

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
}
