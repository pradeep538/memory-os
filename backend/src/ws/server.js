import { App } from 'uWebSockets.js';
import { chatHandler } from './handlers/chatHandler.js';
import { sessionManager } from './managers/sessionManager.js';

const PORT = process.env.WS_PORT || 3001;

/**
 * Kairo WebSocket Server
 * Ultra-fast real-time chat for the Cyberpunk Zen interface
 */
class KairoWebSocketServer {
    constructor() {
        this.app = null;
    }

    start() {
        this.app = App();

        // WebSocket route: /chat
        this.app.ws('/chat', {
            compression: 0,
            maxPayloadLength: 16 * 1024 * 1024, // 16MB for voice messages
            idleTimeout: 60, // 60 seconds
            maxBackpressure: 1024,

            // Connection upgrade (HTTP → WebSocket)
            upgrade: (res, req, context) => {
                const url = req.getUrl();
                const query = req.getQuery();

                res.upgrade(
                    { url, query },
                    req.getHeader('sec-websocket-key'),
                    req.getHeader('sec-websocket-protocol'),
                    req.getHeader('sec-websocket-extensions'),
                    context
                );
            },

            // Connection opened
            open: (ws) => {
                console.log('✅ WebSocket connection opened');

                // Send welcome message
                ws.send(JSON.stringify({
                    type: 'connected',
                    message: 'Welcome to Kairo',
                    timestamp: new Date().toISOString()
                }));
            },

            // Message received
            message: async (ws, message, isBinary) => {
                try {
                    const data = JSON.parse(Buffer.from(message).toString());

                    // Route to chat handler
                    await chatHandler.handleMessage(ws, data);

                } catch (error) {
                    console.error('Message parse error:', error);
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Invalid message format',
                        timestamp: new Date().toISOString()
                    }));
                }
            },

            // Connection draining (about to close)
            drain: (ws) => {
                console.log('WebSocket backpressure: ' + ws.getBufferedAmount());
            },

            // Connection closed
            close: (ws, code, message) => {
                const userId = ws.userId;

                if (userId) {
                    sessionManager.removeSession(userId);
                }

                console.log(`❌ WebSocket connection closed (code: ${code})`);
            }
        });

        // Health check endpoint
        this.app.get('/health', (res, req) => {
            res.writeStatus('200 OK').writeHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
                status: 'ok',
                activeSessions: sessionManager.getActiveCount(),
                timestamp: new Date().toISOString()
            }));
        });

        // Start server
        this.app.listen(PORT, (token) => {
            if (token) {
                console.log('');
                console.log('🚀 Kairo WebSocket Server');
                console.log('='.repeat(50));
                console.log(`✅ Running on ws://localhost:${PORT}/chat`);
                console.log(`✅ Health check: http://localhost:${PORT}/health`);
                console.log('='.repeat(50));
                console.log('');
            } else {
                console.error('❌ Failed to start WebSocket server on port', PORT);
                process.exit(1);
            }
        });
    }

    stop() {
        if (this.app) {
            console.log('Shutting down WebSocket server...');
            // uWebSockets.js doesn't have a built-in close method
            // Just exit process
            process.exit(0);
        }
    }
}

// Create and start server
const server = new KairoWebSocketServer();
server.start();

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nReceived SIGINT, shutting down...');
    server.stop();
});

process.on('SIGTERM', () => {
    console.log('\nReceived SIGTERM, shutting down...');
    server.stop();
});

export default server;
