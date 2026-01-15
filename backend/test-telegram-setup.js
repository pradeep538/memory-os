#!/usr/bin/env node
/**
 * Telegram Bot Setup & Test Script
 * Run this to configure and test your Telegram bot
 */

import telegramService from './src/services/messaging/telegramService.js';
import 'dotenv/config';

console.log('\n🤖 Telegram Bot Setup & Test\n');
console.log('='.repeat(60));

async function testTelegramSetup() {
    try {
        // Step 1: Check configuration
        console.log('\n1️⃣  Checking Configuration...');

        if (!telegramService.isConfigured()) {
            console.error('❌ TELEGRAM_BOT_TOKEN not set!');
            console.log('\nPlease add to .env:');
            console.log('TELEGRAM_BOT_TOKEN=your_token_here\n');
            process.exit(1);
        }

        console.log('✅ Token configured');

        // Step 2: Get bot info
        console.log('\n2️⃣  Getting Bot Info...');

        const botInfo = await telegramService.getMe();
        console.log(`✅ Bot Name: ${botInfo.first_name}`);
        console.log(`✅ Username: @${botInfo.username}`);
        console.log(`✅ Bot ID: ${botInfo.id}`);

        // Step 3: Check webhook status
        console.log('\n3️⃣  Checking Webhook Status...');

        const webhookInfo = await telegramService.getWebhookInfo();

        if (webhookInfo.url) {
            console.log(`✅ Webhook URL: ${webhookInfo.url}`);
            console.log(`✅ Pending Updates: ${webhookInfo.pending_update_count}`);

            if (webhookInfo.last_error_message) {
                console.warn(`⚠️  Last Error: ${webhookInfo.last_error_message}`);
            }
        } else {
            console.log('⚠️  No webhook set (using polling mode or not configured)');
        }

        // Step 4: Instructions
        console.log('\n' + '='.repeat(60));
        console.log('\n📝 Next Steps:\n');
        console.log('1. Start ngrok:');
        console.log('   ngrok http 3000\n');
        console.log('2. Copy the HTTPS URL (e.g., https://abc123.ngrok.io)\n');
        console.log('3. Set webhook:');
        console.log('   curl -F "url=https://abc123.ngrok.io/webhooks/telegram" \\');
        console.log(`        https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/setWebhook\n`);
        console.log('4. Test your bot:');
        console.log(`   - Open Telegram and search for @${botInfo.username}`);
        console.log('   - Send: /start');
        console.log('   - You should get an activation code\n');
        console.log('='.repeat(60));
        console.log('\n✅ Telegram bot is ready to use!');
        console.log(`   Bot: @${botInfo.username}`);
        console.log(`   Webhook endpoint: /webhooks/telegram\n`);

        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error:', error.message);

        if (error.response) {
            console.error('API Error:', error.response.data);
        }

        process.exit(1);
    }
}

testTelegramSetup();
