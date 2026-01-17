
import db from '../src/db/index.js';

const debugLatestPlan = async () => {
    try {
        const query = `
            SELECT id, plan_name, plan_data, created_at 
            FROM plans 
            ORDER BY created_at DESC 
            LIMIT 1
        `;
        const result = await db.query(query);

        if (result.rows.length > 0) {
            const plan = result.rows[0];
            console.log('=== LATEST PLAN DEBUG ===');
            console.log('ID:', plan.id);
            console.log('Name:', plan.plan_name);
            console.log('Created At:', plan.created_at);
            console.log('Plan Data Type:', typeof plan.plan_data);
            console.log('Plan Data Value:', JSON.stringify(plan.plan_data, null, 2));

            // Check phases structure
            if (plan.plan_data.phases) {
                console.log('✅ phrases found in plan_data');
                console.log('First Phase Target:', plan.plan_data.phases[0]?.target);
                console.log('First Phase Schedule:', plan.plan_data.phases[0]?.schedule);
            } else {
                console.error('❌ phases NOT found in plan_data root');
            }
        } else {
            console.log('No plans found.');
        }
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

debugLatestPlan();
