import db from '../../db/index.js';
import { getQuotaForTier, getNextResetTime } from '../../config/voiceQuotas.js';

/**
 * Voice Quota Service
 * 
 * Tracks and enforces voice submission limits per user
 */
class VoiceQuotaService {

    /**
     * Check if user has quota available
     * @param {string} userId 
     * @param {string} tier - 'free', 'pro', 'premium', 'enterprise'
     * @returns {Promise<{allowed: boolean, used: number, limit: number, remaining: number, resetsAt: Date}>}
     */
    async checkQuota(userId, tier = 'free') {
        const quota = getQuotaForTier(tier);

        // Unlimited quota for enterprise
        if (quota.daily_limit === null) {
            return {
                allowed: true,
                used: 0,
                limit: null,
                remaining: 'unlimited',
                resetsAt: null
            };
        }

        // Get today's usage
        const used = await this.getTodayUsage(userId);
        const remaining = Math.max(0, quota.daily_limit - used);
        const allowed = used < quota.daily_limit;

        return {
            allowed,
            used,
            limit: quota.daily_limit,
            remaining,
            resetsAt: getNextResetTime()
        };
    }

    /**
     * Get today's voice submission count for user
     */
    async getTodayUsage(userId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const result = await db.query(`
            SELECT COUNT(*) as count
            FROM memory_units
            WHERE user_id = $1
                AND source = 'voice'
                AND created_at >= $2
        `, [userId, today]);

        return parseInt(result.rows[0]?.count || 0);
    }

    /**
     * Increment usage count (called after successful voice submission)
     */
    async incrementUsage(userId) {
        // Usage is automatically tracked via memory creation
        // This method can be used for additional tracking if needed
        const used = await this.getTodayUsage(userId);
        return used;
    }

    /**
     * Get quota status for user
     */
    async getQuotaStatus(userId, tier = 'free') {
        const quota = getQuotaForTier(tier);
        const used = await this.getTodayUsage(userId);

        if (quota.daily_limit === null) {
            return {
                tier,
                used,
                remaining: 'unlimited',
                limit: null,
                resetsAt: null,
                percentage: 0
            };
        }

        const remaining = Math.max(0, quota.daily_limit - used);
        const percentage = Math.min(100, (used / quota.daily_limit) * 100);

        return {
            tier,
            used,
            remaining,
            limit: quota.daily_limit,
            resetsAt: getNextResetTime(),
            percentage: Math.round(percentage)
        };
    }

    /**
     * Check if user is approaching their limit
     */
    async isApproachingLimit(userId, tier = 'free') {
        const quota = getQuotaForTier(tier);

        if (quota.daily_limit === null) {
            return false;
        }

        const used = await this.getTodayUsage(userId);
        const remaining = quota.daily_limit - used;

        // Warning when 1 submission remaining
        return remaining <= 1;
    }

    /**
     * Get user's subscription tier (placeholder - will be replaced with actual user model)
     */
    async getUserTier(userId) {
        // TODO: Get from user model/subscription service
        // For now, return 'free' as default
        const result = await db.query(`
            SELECT subscription_tier 
            FROM users 
            WHERE id = $1
        `, [userId]);

        return result.rows[0]?.subscription_tier || 'free';
    }
}

export default new VoiceQuotaService();
