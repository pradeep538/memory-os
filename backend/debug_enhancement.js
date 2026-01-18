import dotenv from 'dotenv';
dotenv.config();
import inputEnhancementService from './src/services/input/inputEnhancementService.js';

const testText = "What did I eat for breakfast?";
const userId = 'c3d50e53-701f-4fc7-bd57-e84e0663fb3a';

async function test() {
    console.log(`Testing with: "${testText}"`);
    const result = await inputEnhancementService.enhance(testText, 'text', userId);
    console.log('Enhancement Result:', JSON.stringify(result, null, 2));
}

test();
