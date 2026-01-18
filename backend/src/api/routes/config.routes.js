import configController from '../controllers/config.controller.js';

async function routes(fastify, options) {
    // Public endpoint (or optional auth)
    fastify.get('/features', configController.getFeatureFlags);
    fastify.get('/marquee', configController.getMarqueeExamples);
}

export default routes;
