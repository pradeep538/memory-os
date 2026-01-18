import dotenv from 'dotenv';
dotenv.config();
import { queryParser } from './src/services/query/queryParser.js';

const testText = "What did I eat for breakfast?";

async function test() {
    console.log(`Testing QueryParser with: "${testText}"`);
    try {
        const extracted = await queryParser.parse(testText);
        console.log('Extracted Query:', JSON.stringify(extracted, null, 2));
    } catch (e) {
        console.error('QueryParser failed:', e);
    }
}

test();
