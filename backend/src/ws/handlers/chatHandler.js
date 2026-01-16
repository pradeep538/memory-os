import { sessionManager } from '../managers/sessionManager.js';
import { clarificationService } from '../../services/chat/clarificationService.js';
import { correctionHandler } from '../../services/chat/correctionHandler.js';
import { hybridExtractor } from '../../services/extraction/hybridExtractor.js';
import { rpgStatsCalculator } from '../../services/rpg/statsCalculator.js';
import MemoryModel from '../../models/memory.model.js';
import { validationService } from '../../services/validation/validationService.js';

/**
 * Chat Handler
 * Routes and processes WebSocket messages for the Kairo chat interface
 */
export class ChatHandler {

    /**
     * Handle incoming WebSocket message
     */
    async handleMessage(ws, data) {
        const { type, userId } = data;

        // Ensure session is registered
        if (!sessionManager.getSession(userId)) {
            sessionManager.addSession(userId, ws);
        }

        try {
            switch (type) {
                case 'message':
                    await this.handleTextMessage(ws, data);
                    break;

                case 'voice':
                    await this.handleVoiceMessage(ws, data);
                    break;

                case 'clarification_response':
                    await this.handleClarificationResponse(ws, data);
                    break;

                case 'command':
                    await this.handleCommand(ws, data);
                    break;

                case 'get_stats':
                    await this.sendStats(ws, userId);
                    break;

                default:
                    this.sendError(ws, `Unknown message type: ${type}`);
            }
        } catch (error) {
            console.error('Chat handler error:', error);
            this.sendError(ws, error.message);
        }
    }

    /**
     * Handle text message from user
     */
    async handleTextMessage(ws, data) {
        const { text, userId, messageId } = data;

        // Add to context
        sessionManager.addToContext(userId, { type: 'user', text });

        // Send typing indicator
        this.sendTyping(ws);

        // Check for correction commands first
        const correction = correctionHandler.isCorrectionCommand(text);
        if (correction.type) {
            return await this.handleCorrectionCommand(ws, userId, correction);
        }

        // Extract intent
        const extraction = await hybridExtractor.extract(text);

        // Check for clarification need
        if (extraction.confidence < 0.7) {
            const clarification = await clarificationService.needsClarification(extraction);

            if (clarification.needsClarification) {
                // Store session
                sessionManager.storeClarification(clarification.sessionId, {
                    userId,
                    input: text,
                    options: clarification.options
                });

                return this.sendClarification(ws, clarification, messageId);
            }
        }

        // Process input normally
        const response = await this.processInput(userId, text, extraction);

        // Send response
        this.sendBotMessage(ws, response, messageId);

        // Send updated stats
        await this.sendStats(ws, userId);
    }

    /**
     * Handle voice message (transcribe then process as text)
     */
    async handleVoiceMessage(ws, data) {
        const { audio, userId } = data;

        // TODO: Transcribe audio using Whisper/Gemini
        // For now, send error
        this.sendError(ws, 'Voice transcription not yet implemented');
    }

    /**
     * Handle clarification response
     */
    async handleClarificationResponse(ws, data) {
        const { sessionId, selectedOption, userId } = data;

        const clarification = sessionManager.getClarification(sessionId);

        if (!clarification) {
            return this.sendError(ws, 'Clarification session expired or not found');
        }

        const selected = clarification.options.find(o => o.id === parseInt(selectedOption));

        if (!selected) {
            return this.sendError(ws, 'Invalid option selected');
        }

        // Process the clarified intent
        const response = await this.processInput(userId, clarification.input, {
            intent: selected.intent,
            signals: selected.signals,
            confidence: 1.0,
            method: 'clarified'
        });

        // Remove clarification session
        sessionManager.removeClarification(sessionId);

        // Send response
        this.sendBotMessage(ws, response);

        // Send updated stats
        await this.sendStats(ws, userId);
    }

    /**
     * Handle correction command (undo, edit)
     */
    async handleCorrectionCommand(ws, userId, correction) {
        let result;

        if (correction.type === 'undo') {
            result = await correctionHandler.handleUndo(userId);
        } else if (correction.type === 'edit') {
            result = await correctionHandler.handleEdit(userId, correction.newValue);
        }

        if (result.success) {
            this.sendBotMessage(ws, { text: result.message });
            await this.sendStats(ws, userId);
        } else {
            this.sendError(ws, result.message);
        }
    }

    /**
     * Handle special commands
     */
    async handleCommand(ws, data) {
        const { command, userId } = data;

        if (command === 'undo') {
            const result = await correctionHandler.handleUndo(userId);
            this.sendBotMessage(ws, { text: result.message });
        } else {
            this.sendError(ws, `Unknown command: ${command}`);
        }
    }

    /**
     * Process user input (core logic)
     */
    async processInput(userId, text, extraction) {
        try {
            // Create memory entry
            const memory = await MemoryModel.create({
                userId,
                rawInput: text,
                source: 'chat',
                intent: extraction.intent,
                signals: extraction.signals,
                extraction_method: extraction.method || 'hybrid',
                confidenceScore: extraction.confidence || 0.8,
                status: 'validated'
            });

            // Validate critical intents
            if (['TRACK_MEDICATION', 'TRACK_EXPENSE'].includes(extraction.intent)) {
                const validation = await validationService.validate(userId, extraction.intent, extraction.signals);

                if (!validation.valid) {
                    await MemoryModel.updateStatus(memory.id, userId, 'validation_failed');

                    return {
                        text: `⚠️ ${validation.errors.join(', ')}`,
                        error: true
                    };
                }
            }

            // Generate response text
            const responseText = this.generateResponseText(extraction);

            // Check if chart should be shown
            const shouldShowChart = this.shouldShowChart(extraction.intent);

            return {
                text: responseText,
                messageType: shouldShowChart ? 'chart' : 'text',
                chartData: shouldShowChart ? await this.generateChartData(userId, extraction.intent) : null
            };

        } catch (error) {
            console.error('Process input error:', error);
            return {
                text: '❌ Failed to process input',
                error: true
            };
        }
    }

    /**
     * Generate response text based on intent
     */
    generateResponseText(extraction) {
        const templates = {
            'TRACK_MEDICATION': '✓ Logged medication',
            'BUILD_HABIT': '✓ Logged activity',
            'TRACK_EXPENSE': '✓ Logged expense',
            'LEARN_SKILL': '✓ Logged learning session',
            'GENERAL_LOG': '✓ Logged'
        };

        return templates[extraction.intent] || '✓ Logged';
    }

    /**
     * Determine if chart should be shown
     */
    shouldShowChart(intent) {
        const chartsFor = ['TRACK_MEDICATION', 'BUILD_HABIT'];
        return chartsFor.includes(intent);
    }

    /**
     * Generate chart data
     */
    async generateChartData(userId, intent) {
        // Get last 7 days of data
        const logs = await MemoryModel.query(`
      SELECT DATE(created_at) as day, COUNT(*) as count
      FROM memory_units
      WHERE user_id = ?
        AND intent = ?
        AND created_at > NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY day
    `, [userId, intent]);

        const values = Array(7).fill(0);
        logs.forEach(log => {
            const dayIndex = new Date(log.day).getDay();
            values[dayIndex] = log.count > 0 ? 1 : 0;
        });

        return {
            type: 'adherence',
            values,
            percentage: Math.round((values.filter(v => v === 1).length / 7) * 100)
        };
    }

    /**
     * Send RPG stats update
     */
    async sendStats(ws, userId) {
        try {
            const stats = await rpgStatsCalculator.calculateUserStats(userId);

            ws.send(JSON.stringify({
                type: 'stats_update',
                data: stats,
                timestamp: new Date().toISOString()
            }));
        } catch (error) {
            console.error('Send stats error:', error);
        }
    }

    /**
     * Send bot message
     */
    sendBotMessage(ws, data, replyTo = null) {
        ws.send(JSON.stringify({
            type: 'bot_message',
            messageId: this.generateId(),
            text: data.text,
            messageType: data.messageType || 'text',
            chartData: data.chartData || null,
            timestamp: new Date().toISOString(),
            replyTo
        }));
    }

    /**
     * Send clarification request
     */
    sendClarification(ws, clarification, replyTo) {
        ws.send(JSON.stringify({
            type: 'clarification',
            sessionId: clarification.sessionId,
            question: clarification.question,
            options: clarification.options,
            timestamp: new Date().toISOString(),
            replyTo
        }));
    }

    /**
     * Send typing indicator
     */
    sendTyping(ws) {
        ws.send(JSON.stringify({
            type: 'bot_typing',
            timestamp: new Date().toISOString()
        }));
    }

    /**
     * Send error message
     */
    sendError(ws, message) {
        ws.send(JSON.stringify({
            type: 'error',
            message,
            timestamp: new Date().toISOString()
        }));
    }

    /**
     * Generate unique message ID
     */
    generateId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

export const chatHandler = new ChatHandler();
