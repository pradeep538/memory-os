import integrationService from '../../../services/messaging/integrationService.js';
import telegramService from '../../../services/messaging/telegramService.js';

/**
 * Telegram Controller
 * Handles Telegram bot webhooks
 */
class TelegramController {
    /**
     * Handle Telegram webhook
     * POST /webhooks/telegram
     */
    async handleWebhook(request, reply) {
        try {
            const update = request.body;

            // Ignore non-message updates
            if (!update.message) {
                return { ok: true };
            }

            const chatId = update.message.chat.id;
            const text = update.message.text;
            const voice = update.message.voice;
            const userName = update.message.from.first_name || 'User';

            console.log(`Telegram message from ${chatId}: ${text || '[voice note]'}`);

            // Find or create integration
            const integration = await integrationService.findOrCreateIntegration(
                'telegram',
                chatId.toString()
            );

            // Check if activated
            if (!integration.is_active) {
                await telegramService.sendMessage(
                    chatId,
                    `👋 Hi ${userName}! Welcome to *Memory OS*.\n\n` +
                    `Your activation code is: \`${integration.activation_token}\`\n\n` +
                    `Please open the Memory OS app and go to:\n` +
                    `*Settings → Integrations → Telegram*\n\n` +
                    `Enter this code to link your account. 🔗`
                );
                return { ok: true };
            }

            // Check for commands
            if (text) {
                // Help command
                if (text === '/start' || text === '/help') {
                    await telegramService.sendMessage(
                        chatId,
                        `🤖 *Memory OS Bot*\n\n` +
                        `Send me messages and I'll log them automatically!\n\n` +
                        `*Features:*\n` +
                        `📝 Text messages\n` +
                        `🎤 Voice notes (auto-transcribed)\n` +
                        `👻 Ghost Mode: Silent logging with daily digest\n\n` +
                        `*Commands:*\n` +
                        `/help - Show this message\n` +
                        `/status - Check settings\n` +
                        `/ghost - Toggle Ghost Mode\n\n` +
                        `Just send a message to get started!`
                    );
                    return { ok: true };
                }

                // Status command
                if (text === '/status') {
                    const mode = integration.ghost_mode_enabled ? '👻 Ghost Mode' : '💬 Instant Mode';
                    await telegramService.sendMessage(
                        chatId,
                        `*Your Settings:*\n\n` +
                        `Mode: ${mode}\n` +
                        `Digest Time: ${integration.digest_time}\n` +
                        `Status: ✅ Active\n\n` +
                        `Use /ghost to toggle mode.`
                    );
                    return { ok: true };
                }

                // Ghost mode toggle
                if (text === '/ghost') {
                    const newMode = !integration.ghost_mode_enabled;
                    await integrationService.updatePreferences(integration.id, {
                        ghost_mode_enabled: newMode
                    });

                    await telegramService.sendMessage(
                        chatId,
                        newMode
                            ? `👻 *Ghost Mode Activated*\n\nI'll save your messages silently and send you a daily digest at ${integration.digest_time}.`
                            : `💬 *Instant Mode Activated*\n\nI'll acknowledge each message immediately.`
                    );
                    return { ok: true };
                }
            }

            // Process based on mode
            const ghostMode = integration.ghost_mode_enabled;

            // Process message
            if (voice) {
                // Voice note - download and process
                try {
                    // For now, just acknowledge
                    // TODO: Integrate with audio processing service
                    const messageData = {
                        user_id: integration.user_id,
                        integration_id: integration.id,
                        platform: 'telegram',
                        message_type: 'voice',
                        content: '[Voice note]',
                        processed: false
                    };

                    await integrationService.logMessage(messageData);

                    if (ghostMode) {
                        await telegramService.sendMessage(chatId, '👻');
                    } else {
                        await telegramService.sendMessage(
                            chatId,
                            `🎤 Voice note received! Processing...\n\n` +
                            `_(Voice transcription will be available soon)_`
                        );
                    }
                } catch (error) {
                    console.error('Voice processing error:', error);
                    if (!ghostMode) {
                        await telegramService.sendMessage(
                            chatId,
                            '❌ Error processing voice note. Try again?'
                        );
                    }
                }
            } else if (text && !text.startsWith('/')) {
                // Regular text message
                try {
                    // TODO: Integrate with text processing service
                    const messageData = {
                        user_id: integration.user_id,
                        integration_id: integration.id,
                        platform: 'telegram',
                        message_type: 'text',
                        content: text,
                        processed: false
                    };

                    await integrationService.logMessage(messageData);

                    if (ghostMode) {
                        await telegramService.sendMessage(chatId, '👻');
                    } else {
                        await telegramService.sendMessage(
                            chatId,
                            `✅ Logged: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`
                        );
                    }
                } catch (error) {
                    console.error('Text processing error:', error);
                    if (!ghostMode) {
                        await telegramService.sendMessage(
                            chatId,
                            '❌ Error logging message. Try again?'
                        );
                    }
                }
            }

            return { ok: true };

        } catch (error) {
            console.error('Telegram webhook error:', error);
            return { ok: false, error: error.message };
        }
    }
}

export default new TelegramController();
