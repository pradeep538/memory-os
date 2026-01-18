
import db from '../src/db/index.js';
import queryEngine from '../src/services/intelligence/queryEngineService.js';

async function debug() {
    console.log("🔍 Debugging Query Engine...");

    // 1. Fetch recent memories to see how "saloon" was stored
    console.log("\n1️⃣  All 'trip' Memories:");
    const res = await db.query(`
    SELECT id, raw_input, category, normalized_data, created_at
    FROM memory_units 
    WHERE raw_input ILIKE '%car%'
    ORDER BY created_at DESC
  `);
    res.rows.forEach(r => {
        console.log(`\n[${r.id}] ${r.created_at}`);
        console.log(`   Input: "${r.raw_input}"`);
        console.log(`   Category: ${r.category}`);
        console.log(`   Data:`, JSON.stringify(r.normalized_data));
    });

    // 2. Test the specific query
    const question = "How much I spent on saloon?";
    console.log(`\n2️⃣  Simulating Query: "${question}"`);

    // Force specific intent to test SQL generation
    const intent = {
        type: 'aggregate',
        category: 'finance', // Assuming it detects finance
        timeRange: 'all',    // specific time might be an issue, lets try 'all' first
        metric: 'amount',
        filter: 'saloon',
        limit: null
    };

    console.log("   Intent:", JSON.stringify(intent));

    const safeQuery = queryEngine.buildSafeQuery('c3d50e53-701f-4fc7-bd57-e84e0663fb3a', intent); // Hardcoded user ID from logs
    console.log("\n3️⃣  Generated SQL:");
    console.log(safeQuery.sql);
    console.log("   Params:", safeQuery.params);

    // 3. Execute
    const exec = await db.query(safeQuery.sql, safeQuery.params);
    console.log("\n4️⃣  Execution Result:", exec.rows);
}

debug();
