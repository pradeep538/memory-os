
import adminController from '../controllers/admin.controller.js';

async function routes(fastify, options) {
    fastify.get('/patterns', adminController.getPatternsDebug);
    fastify.post('/analyze', adminController.triggerAnalysis);
}

export default routes;
