import db from '../../db/index.js';
import crypto from 'crypto';

/**
 * Integration Service
 * Manages user mapping for messaging platforms (WhatsApp, Telegram)
 */
class IntegrationService {
    /**
     * Find or create integration for platform user
     * @param {string} platform - 'whatsapp' or 'telegram'
     * @param {string} platformUserId - Phone number or chat_id
     * @returns {Promise<Object>} Integration record
     */
    async findOrCreateIntegration(platform, platformUserId) {
        const query = `
            SELECT * FROM user_integrations
            WHERE platform = $1 AND platform_user_id = $2
        `;

        const result = await db.query(query, [platform, platformUserId]);

        if (result.rows.length > 0) {
            // Update last message time
            await this.updateLastMessageTime(result.rows[0].id);
            return result.rows[0];
        }

        // New user - create pending integration
        return await this.createPendingIntegration(platform, platformUserId);
    }

    /**
     * Create pending integration (requires activation)
     * @param {string} platform
     * @param {string} platformUserId
     * @returns {Promise<Object>}
     */
    async createPendingIntegration(platform, platformUserId) {
        // Generate 6-character activation token
        const activationToken = crypto.randomBytes(3).toString('hex').toUpperCase();

        const query = `
            INSERT INTO user_integrations (
                platform, platform_user_id, activation_token, is_active
            )
            VALUES ($1, $2, $3, false)
            RETURNING *
        `;

        const result = await db.query(query, [
            platform,
            platformUserId,
            activationToken
        ]);

        console.log(`Created pending integration for ${platform}:${platformUserId} with token ${activationToken}`);

        return result.rows[0];
    }

    /**
     * Activate integration by linking to user
     * @param {string} platform
     * @param {string} platformUserId
     * @param {string} activationCode
     * @param {string} userId - Memory OS user ID
     * @returns {Promise<Object|null>}
     */
    async activateIntegration(platform, platformUserId, activationCode, userId) {
        const query = `
            UPDATE user_integrations
            SET user_id = $1,
                is_active = true,
                activated_at = NOW(),
                activation_token = NULL
            WHERE platform = $2
              AND platform_user_id = $3
              AND activation_token = $4
            RETURNING *
        `;

        const result = await db.query(query, [
            userId,
            platform,
            platformUserId,
            activationCode.toUpperCase()
        ]);

        if (result.rows.length > 0) {
            console.log(`Activated ${platform} integration for user ${userId}`);
        }

        return result.rows[0] || null;
    }

    /**
     * Get integration by activation token
     * @param {string} activationCode
     * @returns {Promise<Object|null>}
     */
    async getIntegrationByToken(activationCode) {
        const query = `
            SELECT * FROM user_integrations
            WHERE activation_token = $1
              AND is_active = false
        `;

        const result = await db.query(query, [activationCode.toUpperCase()]);
        return result.rows[0] || null;
    }

    /**
     * Update last message time
     * @param {string} integrationId
     */
    async updateLastMessageTime(integrationId) {
        const query = `
            UPDATE user_integrations
            SET last_message_at = NOW()
            WHERE id = $1
        `;

        await db.query(query, [integrationId]);
    }

    /**
     * Update preferences
     * @param {string} integrationId
     * @param {Object} preferences
     * @returns {Promise<Object>}
     */
    async updatePreferences(integrationId, preferences) {
        const query = `
            UPDATE user_integrations
            SET ghost_mode_enabled = COALESCE($1, ghost_mode_enabled),
                reply_mode = COALESCE($2, reply_mode),
                digest_time = COALESCE($3, digest_time),
                timezone = COALESCE($4, timezone)
            WHERE id = $5
            RETURNING *
        `;

        const result = await db.query(query, [
            preferences.ghost_mode_enabled,
            preferences.reply_mode,
            preferences.digest_time,
            preferences.timezone,
            integrationId
        ]);

        return result.rows[0];
    }

    /**
     * Get user's integrations
     * @param {string} userId
     * @returns {Promise<Array>}
     */
    async getUserIntegrations(userId) {
        const query = `
            SELECT * FROM user_integrations
            WHERE user_id = $1
            ORDER BY created_at DESC
        `;

        const result = await db.query(query, [userId]);
        return result.rows;
    }

    /**
     * Deactivate integration
     * @param {string} integrationId
     * @param {string} userId
     */
    async deactivateIntegration(integrationId, userId) {
        const query = `
            UPDATE user_integrations
            SET is_active = false
            WHERE id = $1 AND user_id = $2
        `;

        await db.query(query, [integrationId, userId]);
    }

    /**
     * Log platform message
     * @param {Object} messageData
     */
    async logMessage(messageData) {
        const query = `
            INSERT INTO platform_messages (
                user_id, integration_id, platform, message_type,
                content, media_url, processed, memory_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;

        const result = await db.query(query, [
            messageData.user_id,
            messageData.integration_id,
            messageData.platform,
            messageData.message_type,
            messageData.content,
            messageData.media_url,
            messageData.processed || false,
            messageData.memory_id
        ]);

        return result.rows[0];
    }
}

export default new IntegrationService();
