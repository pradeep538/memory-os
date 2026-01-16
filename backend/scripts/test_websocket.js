#!/usr/bin/env node

/**
 * Test WebSocket Server
 */

import WebSocket from 'ws';

const WS_URL = 'ws://localhost:3001/chat';
const TEST_USER_ID = 'test-user-123';

async function testWebSocketConnection() {
    console.log('🧪 Testing WebSocket Connection\n');

    return new Promise((resolve, reject) => {
        const ws = new WebSocket(WS_URL);
        let messageCount = 0;

        ws.on('open', () => {
            console.log('✅ Connected to WebSocket server\n');

            // Test 1: Send text message
            console.log('📤 Sending text message...');
            ws.send(JSON.stringify({
                type: 'message',
                text: 'I took vitamin C',
                userId: TEST_USER_ID,
                messageId: 'test-msg-1',
                timestamp: new Date().toISOString()
            }));
        });

        ws.on('message', (data) => {
            const message = JSON.parse(data.toString());
            messageCount++;

            console.log(`📥 Received message ${messageCount}:`);
            console.log(`   Type: ${message.type}`);

            if (message.type === 'bot_message') {
                console.log(`   Text: ${message.text}`);
                console.log(`   Message Type: ${message.messageType || 'text'}`);

                if (message.chartData) {
                    console.log(`   Chart: ${JSON.stringify(message.chartData)}`);
                }
            } else if (message.type === 'stats_update') {
                console.log(`   Stats: Level ${message.data.level}, Streak ${message.data.streak}`);
            }

            console.log('');

            // After receiving stats, test get_stats command
            if (message.type === 'stats_update' && messageCount === 2) {
                setTimeout(() => {
                    console.log('📤 Requesting stats update...');
                    ws.send(JSON.stringify({
                        type: 'get_stats',
                        userId: TEST_USER_ID
                    }));
                }, 500);
            }

            // Close after receiving 4 messages
            if (messageCount >= 4) {
                setTimeout(() => {
                    console.log('✅ All tests passed\n');
                    ws.close();
                    resolve();
                }, 1000);
            }
        });

        ws.on('error', (error) => {
            console.error('❌ WebSocket error:', error.message);
            reject(error);
        });

        ws.on('close', () => {
            console.log('🔌 Connection closed\n');
        });

        // Timeout after 10 seconds
        setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
            reject(new Error('Test timeout'));
        }, 10000);
    });
}

async function testRPGStats() {
    console.log('🧪 Testing RPG Stats\n');

    return new Promise((resolve, reject) => {
        const ws = new WebSocket(WS_URL);

        ws.on('open', () => {
            console.log('✅ Connected\n');

            ws.send(JSON.stringify({
                type: 'get_stats',
                userId: TEST_USER_ID
            }));
        });

        ws.on('message', (data) => {
            const message = JSON.parse(data.toString());

            if (message.type === 'stats_update') {
                console.log('📊 RPG Stats:');
                console.log(`   Level: ${message.data.level}`);
                console.log(`   XP: ${message.data.xp.percentage}%`);
                console.log(`   Streak: ${message.data.streak} days`);
                console.log(`   Health: ${message.data.health}%`);
                console.log(`   Class: ${message.data.class} ${message.data.classIcon}`);
                console.log('');

                console.log('✅ RPG stats test passed\n');
                ws.close();
                resolve();
            }
        });

        ws.on('error', (error) => {
            console.error('❌ Error:', error.message);
            reject(error);
        });

        setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
            reject(new Error('Stats test timeout'));
        }, 5000);
    });
}

async function runTests() {
    console.log('='.repeat(60));
    console.log('Kairo WebSocket Server - Tests');
    console.log('='.repeat(60));
    console.log('');

    try {
        await testWebSocketConnection();
        await testRPGStats();

        console.log('='.repeat(60));
        console.log('🎉 ALL TESTS PASSED');
        console.log('='.repeat(60));

        process.exit(0);
    } catch (error) {
        console.error('\n' + '='.repeat(60));
        console.error('💥 TESTS FAILED');
        console.error('='.repeat(60));
        console.error(error);

        process.exit(1);
    }
}

runTests();
