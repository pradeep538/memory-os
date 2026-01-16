import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import config from './config/index.js';
import db from './db/index.js';
import { authenticate, optionalAuth } from './middleware/auth.js';

// Routes
import configRoutes from './api/routes/config.routes.js';
import memoryRoutes from './api/routes/memory.routes.js';
import inputRoutes from './api/routes/input.routes.js';
import insightsRoutes from './api/routes/insights.routes.js';
import notificationsRoutes from './api/routes/notifications.routes.js';
import modulesRoutes from './api/routes/modules.routes.js';
import queryRoutes from './api/routes/query.routes.js';
import habitRoutes from './api/routes/habits.routes.js';
import planRoutes from './api/routes/plans.routes.js';
import scenarioRoutes from './api/routes/scenarios.routes.js';
import entityRoutes from './api/routes/entities.routes.js';
import engagementRoutes from './api/routes/engagement.routes.js';
import correlationRoutes from './api/routes/correlations.routes.js';
import messagingRoutes from './api/routes/messaging.routes.js';
import routinesRoutes from './api/routes/routines.routes.js';

console.log('🚀 Starting Memory OS backend...');

const fastify = Fastify({
    logger: config.isDev
});

// Register plugins
await fastify.register(helmet);
await fastify.register(cors);
await fastify.register(multipart, {
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    }
});

// Swagger documentation
await fastify.register(swagger, {
    swagger: {
        info: {
            title: 'Memory OS API',
            description: 'Multi-domain intelligence and memory system',
            version: '1.0.0'
        }
    }
});

await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
        docExpansion: 'list',
        deepLinking: false
    }
});

// Health check
fastify.get('/health', async (request, reply) => {
    try {
        await db.query('SELECT 1');
        return {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: 'connected'
        };
    } catch (error) {
        reply.code(500);
        return {
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            database: 'disconnected',
            error: error.message
        };
    }
});

// API info
fastify.get('/api/v1', async (request, reply) => {
    return {
        name: 'Memory OS API',
        version: '1.0.0',
        endpoints: {
            memory: '/api/v1/memory',
            input: '/api/v1/input',
            insights: '/api/v1/insights',
            habits: '/api/v1/habits',
            plans: '/api/v1/plans',
            query: '/api/v1/query',
            scenarios: '/api/v1/scenarios',
            notifications: '/api/v1/notifications',
            modules: '/api/v1/modules',
            entities: '/api/v1/entities',
            engagement: '/api/v1/engagement',
            correlations: '/api/v1/correlations',
            integrations: '/api/v1/integrations',
            webhooks: '/webhooks'
        }
    };
});

// Add authentication hook to all /api/v1 routes
fastify.addHook('preHandler', async (request, reply) => {
    // Skip auth for health check and public endpoints
    if (request.url === '/health' ||
        request.url === '/api/v1' ||
        request.url.startsWith('/docs') ||
        request.url.startsWith('/webhooks')) {
        return;
    }

    // Apply strict authentication to all API routes
    // Requires valid Firebase token (dev mode: falls back to demo user)
    await authenticate(request, reply);
});

// Register routes
await fastify.register(memoryRoutes, { prefix: '/api/v1/memory' });
await fastify.register(inputRoutes, { prefix: '/api/v1/input' });
await fastify.register(insightsRoutes, { prefix: '/api/v1/insights' });
await fastify.register(notificationsRoutes, { prefix: '/api/v1/notifications' });
await fastify.register(modulesRoutes, { prefix: '/api/v1/modules' });
await fastify.register(queryRoutes, { prefix: '/api/v1/query' });
await fastify.register(habitRoutes, { prefix: '/api/v1' });
await fastify.register(planRoutes, { prefix: '/api/v1' });
await fastify.register(scenarioRoutes, { prefix: '/api/v1' });
await fastify.register(entityRoutes, { prefix: '/api/v1' });
await fastify.register(correlationRoutes, { prefix: '/api/v1' });
await fastify.register(messagingRoutes, { prefix: '/api/v1' });
await fastify.register(engagementRoutes, { prefix: '/api/v1/engagement' });
await fastify.register(configRoutes, { prefix: '/api/v1/config' });
await fastify.register(routinesRoutes, { prefix: '/api/v1/routines' });

// Error handler
fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error(error);
    reply.code(error.statusCode || 500).send({
        error: error.message || 'Internal Server Error',
        statusCode: error.statusCode || 500,
        ...(config.env === 'development' && { stack: error.stack })
    });
});

// Start server
const start = async () => {
    try {
        // Start Queue Client (for producing jobs)
        const queue = (await import('./lib/queue.js')).default;
        await queue.start();
        console.log('🐘 Queue client ready');

        // Start Background Worker (in same process for dev/simplicity)
        const { startWorker } = await import('./worker.js');
        await startWorker();
        console.log('👷 Background Worker attached');

        // Start Fastify server
        try {
            await fastify.listen({
                port: config.port,
                host: config.host
            });
        } catch (listenError) {
            if (listenError.code === 'EADDRINUSE') {
                console.error(`❌ Port ${config.port} is already in use!`);
                console.error(`   Try: lsof -i :${config.port} -t | xargs kill -9`);
            } else {
                console.error('❌ Failed to start server:', listenError.message);
                console.error(listenError.stack);
            }
            throw listenError;
        }


        console.log(`
🧠 Memory OS Backend
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Environment: ${config.env}
Server:      http://${config.host}:${config.port}
Health:      http://localhost:${config.port}/health
Docs:        http://localhost:${config.port}/docs
API:         http://localhost:${config.port}/api/v1
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

        // Start scheduled jobs (with error handling to prevent crash)
        try {
            const schedulerService = (await import('./services/notifications/schedulerService.js')).default;
            if (schedulerService?.startAll) {
                schedulerService.startAll();
            }
        } catch (err) {
            console.error('⚠️  Scheduler failed to start:', err.message);
            if (config.isDev) {
                console.error(err.stack);
            }
            // Continue without scheduler - not critical
        }
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

// Graceful shutdown
const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received, closing server...`);

    // Stop Queue
    try {
        const queue = (await import('./lib/queue.js')).default;
        await queue.stop();
        console.log('🐘 Queue stopped');
    } catch (err) {
        console.error('Error stopping queue:', err);
    }

    await fastify.close();
    process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

if (process.env.NODE_ENV !== 'test') {
    start();
}

export default fastify;
