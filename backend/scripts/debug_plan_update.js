import inputEnhancementService from '../src/services/input/inputEnhancementService.js';
import PlanModel from '../src/models/plan.model.js';
import { query } from '../src/db/index.js';
import dotenv from 'dotenv';

dotenv.config();

async function debugPlanUpdate() {
    console.log('🧪 Debugging Action Plan Update Flow...');

    const TEST_USER_ID = 'c3d50e53-701f-4fc7-bd57-e84e0663fb3a'; // geetamg538
    const TEST_INPUT = 'took medicine today';

    try {
        // 1. Check active plans for this user
        console.log(`\n1. Checking active plans for user ${TEST_USER_ID}...`);
        const activePlans = await PlanModel.findActive(TEST_USER_ID);
        console.log(`   Found ${activePlans.length} active plans:`);
        activePlans.forEach(p => {
            console.log(`   - [${p.id}] ${p.plan_name} (Category: ${p.category})`);
        });

        // 2. Run enhancement
        console.log(`\n2. Running enhancement for: "${TEST_INPUT}"...`);
        const enhancement = await inputEnhancementService.enhance(TEST_INPUT, 'text', TEST_USER_ID);

        console.log('\n--- LLM Result ---');
        console.log(JSON.stringify(enhancement, null, 2));
        console.log('------------------');

        if (enhancement.plan_updates && enhancement.plan_updates.length > 0) {
            console.log('✅ LLM detected plan updates!');
        } else {
            console.log('❌ LLM did NOT detect any plan updates.');
        }

        // 3. Test matching logic in PlanProgressService
        console.log(`\n3. Testing category-based matching (Simulating PlanProgressService)...`);
        const category = enhancement.detected_category;
        console.log(`   Detected Category: ${category}`);

        const matchingPlans = activePlans.filter(p => p.category.toLowerCase() === category.toLowerCase());
        if (matchingPlans.length > 0) {
            console.log(`   ✅ Category "${category}" matches ${matchingPlans.length} plan(s).`);
        } else {
            console.log(`   ❌ Category "${category}" does NOT match any active plans.`);
            console.log(`   Expected one of: ${activePlans.map(p => p.category).join(', ')}`);
        }

    } catch (err) {
        console.error('❌ Debug failed:', err);
    } finally {
        process.exit(0);
    }
}

debugPlanUpdate();
