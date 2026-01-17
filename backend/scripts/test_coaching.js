import planCoachingService from '../src/services/plans/planCoachingService.js';
import { query } from '../src/db/index.js';

async function testCoaching() {
    console.log('🧪 Testing Plan Coaching Service...');

    // 1. Force run the check
    // Note: The service has a check for "9 AM" or "Sunday 8 PM".
    // We will bypass that or mock the time if needed, but the service logic currently restricts actual notifications to those hours.

    // To verify logic, we can inspect what the service WOULD do.
    // However, since we can't easily mock Date() inside the imported module without dependency injection,
    // we will rely on the console logs from the service.

    // STARTUP WORKAROUND: We can just Modify the service temporarily OR rely on the "stagnation" check log.
    // Actually, looking at the code, it logs "[PlanCoaching] Checking X active plans" before checking time.

    await planCoachingService.checkAllPlans();

    console.log('✅ Test Complete. Check logs above for "Sending Nudge" messages (if any conditions met) or "Checking active plans".');
    process.exit(0);
}

testCoaching();
