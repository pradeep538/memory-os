import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import config from './config/index.js';
import db from './db/index.js';

// Routes
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
await fastify.register(engagementRoutes, { prefix: '/api/v1' });
await fastify.register(correlationRoutes, { prefix: '/api/v1' });
await fastify.register(messagingRoutes, { prefix: '/api/v1' });

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
        await fastify.listen({
            port: config.port,
            host: config.host
        });


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

        // Start scheduled jobs
        const schedulerService = (await import('./services/notifications/schedulerService.js')).default;
        schedulerService.startAll();
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

// Graceful shutdown
const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received, closing server...`);
    await fastify.close();
    process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

start();

export default fastify;
