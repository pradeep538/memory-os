import axios from 'axios';
import config from '../../config/index.js';

/**
 * Telegram Service
 * Wrapper for Telegram Bot API
 */
class TelegramService {
    constructor() {
        this.token = config.telegram?.botToken || process.env.TELEGRAM_BOT_TOKEN;
        this.baseUrl = this.token ? `https://api.telegram.org/bot${this.token}` : null;
    }

    /**
     * Check if Telegram is configured
     */
    isConfigured() {
        return !!this.token;
    }

    /**
     * Send text message
     * @param {string|number} chatId
     * @param {string} text
     * @param {Object} options - Optional parameters (parse_mode, etc.)
     */
    async sendMessage(chatId, text, options = {}) {
        if (!this.isConfigured()) {
            console.warn('Telegram not configured');
            return null;
        }

        const url = `${this.baseUrl}/sendMessage`;

        try {
            const response = await axios.post(url, {
                chat_id: chatId,
                text,
                parse_mode: options.parse_mode || 'Markdown',
                ...options
            });

            return response.data;
        } catch (error) {
            console.error('Telegram sendMessage error:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Download voice note
     * @param {string} fileId
     * @returns {Promise<Buffer>}
     */
    async downloadVoiceNote(fileId) {
        if (!this.isConfigured()) {
            throw new Error('Telegram not configured');
        }

        try {
            // Get file path
            const fileUrl = `${this.baseUrl}/getFile?file_id=${fileId}`;
            const fileRes = await axios.get(fileUrl);
            const filePath = fileRes.data.result.file_path;

            // Download file
            const downloadUrl = `https://api.telegram.org/file/bot${this.token}/${filePath}`;
            const audioRes = await axios.get(downloadUrl, { responseType: 'arraybuffer' });

            return Buffer.from(audioRes.data);
        } catch (error) {
            console.error('Telegram downloadVoiceNote error:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Set webhook
     * @param {string} webhookUrl - Full webhook URL (e.g., https://your-domain.com/webhooks/telegram)
     */
    async setWebhook(webhookUrl) {
        if (!this.isConfigured()) {
            throw new Error('Telegram not configured');
        }

        const url = `${this.baseUrl}/setWebhook`;

        try {
            const response = await axios.post(url, {
                url: webhookUrl,
                allowed_updates: ['message']  // Only receive messages
            });

            console.log('Telegram webhook set:', response.data);
            return response.data;
        } catch (error) {
            console.error('Telegram setWebhook error:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Get webhook info
     */
    async getWebhookInfo() {
        if (!this.isConfigured()) {
            throw new Error('Telegram not configured');
        }

        const url = `${this.baseUrl}/getWebhookInfo`;

        try {
            const response = await axios.get(url);
            return response.data.result;
        } catch (error) {
            console.error('Telegram getWebhookInfo error:', error.message);
            throw error;
        }
    }

    /**
     * Remove webhook (for testing with polling)
     */
    async deleteWebhook() {
        if (!this.isConfigured()) {
            throw new Error('Telegram not configured');
        }

        const url = `${this.baseUrl}/deleteWebhook`;

        try {
            const response = await axios.post(url);
            console.log('Telegram webhook deleted:', response.data);
            return response.data;
        } catch (error) {
            console.error('Telegram deleteWebhook error:', error.message);
            throw error;
        }
    }

    /**
     * Get bot info
     */
    async getMe() {
        if (!this.isConfigured()) {
            throw new Error('Telegram not configured');
        }

        const url = `${this.baseUrl}/getMe`;

        try {
            const response = await axios.get(url);
            return response.data.result;
        } catch (error) {
            console.error('Telegram getMe error:', error.message);
            throw error;
        }
    }
}

export default new TelegramService();
