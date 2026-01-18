
import axios from 'axios';
import db from './src/db/index.js';

const PYTHON_API = 'http://localhost:8001/api/v1/patterns';

async function debugPython() {
    console.log('🐍 Debugging Python Service...');

    // Get a user
    const userRes = await db.query('SELECT id FROM users LIMIT 1');
    const userId = userRes.rows[0].id;
    console.log(`   User: ${userId}`);

    try {
        const url = `${PYTHON_API}/${userId}`;
        console.log(`   GET ${url}`);
        const res = await axios.get(url);
        console.log('   ✅ Success!');
        console.log(JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.error('   ❌ Failed:', e.message);
        if (e.response) {
            console.error('   Status:', e.response.status);
            console.error('   Data:', e.response.data);
        }
    }
    process.exit(0);
}

debugPython();
