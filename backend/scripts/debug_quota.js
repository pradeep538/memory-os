import db from '../src/db/index.js';
import voiceQuotaService from '../src/services/quota/voiceQuotaService.js';
import { getQuotaForTier } from '../src/config/voiceQuotas.js';

async function debugQuota() {
    try {
        console.log('🔍 Debugging Voice Quotas...');

        const res = await db.query('SELECT id, email, subscription_tier FROM users');

        for (const user of res.rows) {
            console.log(`\n👤 User: ${user.email} (${user.id})`);
            console.log(`   Tier from DB: ${user.subscription_tier}`);

            const tier = user.subscription_tier || 'free';
            const quota = getQuotaForTier(tier);
            const usage = await voiceQuotaService.getTodayUsage(user.id);

            console.log(`   Effective Tier: ${tier}`);
            console.log(`   Daily Limit Config: ${quota.daily_limit}`);
            console.log(`   Today's Usage: ${usage}`);
            console.log(`   Remaining: ${quota.daily_limit - usage}`);
        }

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        process.exit();
    }
}

debugQuota();
