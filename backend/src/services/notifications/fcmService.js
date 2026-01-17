import admin from 'firebase-admin';
import { query } from '../../db/index.js';

class FcmService {
    /**
     * Register or update an FCM token for a user
     */
    async registerToken(userId, token, deviceInfo = {}) {
        const sql = `
            INSERT INTO user_fcm_tokens (user_id, token, device_info, last_updated)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (token) DO UPDATE SET
                user_id = EXCLUDED.user_id,
                device_info = EXCLUDED.device_info,
                last_updated = NOW()
            RETURNING *;
        `;

        const result = await query(sql, [userId, token, JSON.stringify(deviceInfo)]);
        console.log(`[FCM] Registered token for user ${userId}`);
        return result.rows[0];
    }

    /**
     * Send a push notification to all devices of a user
     */
    async sendPushToUser(userId, title, body, data = {}) {
        // Fetch all tokens for this user
        const tokensResult = await query(
            'SELECT token FROM user_fcm_tokens WHERE user_id = $1',
            [userId]
        );

        const tokens = tokensResult.rows.map(r => r.token);

        if (tokens.length === 0) {
            console.log(`[FCM] No tokens found for user ${userId}. Skipping push.`);
            return { success: false, reason: 'no_tokens' };
        }

        console.log(`[FCM] Sending push to ${tokens.length} devices for user ${userId}`);

        const message = {
            notification: {
                title,
                body
            },
            data: {
                ...data,
                click_action: 'FLUTTER_NOTIFICATION_CLICK'
            },
            tokens: tokens
        };

        try {
            const response = await admin.messaging().sendEachForMulticast(message);

            // Clean up invalid tokens
            if (response.failureCount > 0) {
                const invalidTokens = [];
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        const error = resp.error;
                        if (error.code === 'messaging/invalid-registration-token' ||
                            error.code === 'messaging/registration-token-not-registered') {
                            invalidTokens.push(tokens[idx]);
                        }
                    }
                });

                if (invalidTokens.length > 0) {
                    await this.removeTokens(invalidTokens);
                }
            }

            return {
                success: true,
                successCount: response.successCount,
                failureCount: response.failureCount
            };
        } catch (error) {
            console.error('[FCM] Error sending multicast message:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Remove invalid tokens from the database
     */
    async removeTokens(tokens) {
        if (tokens.length === 0) return;
        const sql = 'DELETE FROM user_fcm_tokens WHERE token = ANY($1)';
        await query(sql, [tokens]);
        console.log(`[FCM] Removed ${tokens.length} invalid tokens`);
    }
}

export default new FcmService();
