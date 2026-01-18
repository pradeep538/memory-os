
import audioEnhancementService from '../src/services/input/audioEnhancementService.js';

async function test() {
    const text = "I spent 30 rupee on haircut";
    console.log(`Testing input: "${text}"`);

    try {
        // Mock userId
        const userId = 'debug-user';
        const enhancement = await audioEnhancementService.enhance(text, 'text', userId);

        console.log("Enhancement Result:");
        console.log(JSON.stringify(enhancement, null, 2));

    } catch (error) {
        console.error("Error:", error);
    }
}

test();
