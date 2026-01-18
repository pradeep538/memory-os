/**
 * Voice Quota Configuration
 * 
 * Define voice submission limits per user tier
 */

export const VOICE_QUOTAS = {
    free: {
        daily_limit: 30,
        reset_interval: 'daily', // daily, weekly, monthly
        overage_allowed: false
    },
    pro: {
        daily_limit: 100,
        reset_interval: 'daily',
        overage_allowed: false
    },
    premium: {
        daily_limit: 200,
        reset_interval: 'daily',
        overage_allowed: false
    }
};

/**
 * Get quota for user tier
 */
export function getQuotaForTier(tier = 'free') {
    return VOICE_QUOTAS[tier] || VOICE_QUOTAS.free;
}

/**
 * Get next reset time
 */
export function getNextResetTime() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
}
