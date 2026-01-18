
import axios from 'axios';
import { randomUUID } from 'crypto';

const API_BASE = 'http://127.0.0.1:3000/api/v1';

// Helper for delays
const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function runDemo() {
    const TEST_USER_ID = randomUUID();
    console.log(`🚀 Starting Kairo Capabilities Demo (User: ${TEST_USER_ID})...\n`);

    const headers = { 'x-demo-user-id': TEST_USER_ID };

    // --- Scenario 1: Fitness (Logging & Checking) ---
    console.log("--- 🏃 SCENARIO 1: FITNESS TRACKING ---");

    // 1. Log Activity
    console.log("👉 User Input: 'I just finished a 5k run'");
    let res = await axios.post(`${API_BASE}/input/text`, { text: "I just finished a 5k run" }, { headers });

    console.log("   ✅ System Action: LOGGING");
    console.log(`   📝 Confirmation: "${res.data.data.confirmation}"`);

    await wait(2000);

    // 2. Query Last Occurrence
    console.log("\n👉 User Input: 'When was my last run?'");
    res = await axios.post(`${API_BASE}/input/text`, { text: "When was my last run?" }, { headers });
    console.log("   ✅ System Action: QUERY");
    console.log(`   🔍 Intent: ${res.data.data.intent}`);
    console.log(`   💡 Answer: "${res.data.data.answer}"`);

    await wait(2000);

    // --- Scenario 2: Finance (Logging & Frequency) ---
    console.log("\n--- 💰 SCENARIO 2: FINANCIAL TRACKING ---");

    // 1. Log First Expense
    console.log("👉 User Input: 'Spent $15 on Coffee'");
    res = await axios.post(`${API_BASE}/input/text`, { text: "Spent $15 on Coffee" }, { headers });
    console.log("   ✅ System Action: LOGGING");
    console.log(`   📝 Confirmation: "${res.data.data.confirmation}"`);

    await wait(4000); // Increased delay to avoid 429 Resource Exhausted

    // 2. Log Second Expense
    console.log("\n👉 User Input: 'Bought another coffee for $5'");
    res = await axios.post(`${API_BASE}/input/text`, { text: "Bought another coffee for $5" }, { headers });
    console.log("   ✅ System Action: LOGGING");
    console.log(`   📝 Confirmation: "${res.data.data.confirmation}"`);

    await wait(2000);

    // 3. Query Frequency/Count
    console.log("\n👉 User Input: 'How many times have I bought coffee?'");
    res = await axios.post(`${API_BASE}/input/text`, { text: "How many times have I bought coffee?" }, { headers });
    console.log("   ✅ System Action: QUERY");
    console.log(`   🔍 Intent: ${res.data.data.intent} (COUNT_TOTAL)`);
    console.log(`   💡 Answer: "${res.data.data.answer}"`);

    await wait(2000);

    // 4. Query Sum
    console.log("\n👉 User Input: 'How much total did I spend on coffee?'");
    res = await axios.post(`${API_BASE}/input/text`, { text: "How much total did I spend on coffee?" }, { headers });
    console.log("DEBUG:", JSON.stringify(res.data, null, 2));

    console.log("   ✅ System Action: QUERY");
    console.log(`   🔍 Intent: ${res.data.data.intent} (SUM_TOTAL)`);
    console.log(`   💡 Answer: "${res.data.data.answer}"`);

    // Verify exact math
    const total = parseFloat(res.data.data.answer.replace(/[^0-9.]/g, ''));
    if (total === 20) {
        console.log("\n✅ MATH VERIFICATION: PASS (15 + 5 = 20)");
    } else {
        console.log(`\n❌ MATH VERIFICATION: FAIL (Expected 20, got ${total})`);
    }

    console.log("\n✅ Demo Complete.");
}

runDemo().catch(console.error);
