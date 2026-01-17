import fcmService from '../src/services/notifications/fcmService.js';
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function initFirebase() {
    if (admin.apps.length) return;

    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('✅ Firebase Admin initialized via service account file');
    } else {
        console.error('❌ FIREBASE_SERVICE_ACCOUNT_PATH not found or invalid.');
        process.exit(1);
    }
}

async function sendTestPush() {
    const token = process.argv[2];
    if (!token) {
        console.error('❌ Please provide an FCM token: node scripts/send_test_push.js <YOUR_TOKEN>');
        process.exit(1);
    }

    await initFirebase();

    console.log(`🚀 Sending test push to token: ${token.substring(0, 10)}...`);

    const message = {
        notification: {
            title: 'Kairo Test 🛡️',
            body: 'Is this reaching the lock screen? If yes, FCM is 100% live!'
        },
        data: {
            test: 'true',
            timestamp: new Date().toISOString()
        },
        token: token
    };

    try {
        const response = await admin.messaging().send(message);
        console.log('✅ Successfully sent push message:', response);
    } catch (error) {
        console.error('❌ Error sending push message:', error);
    }
}

sendTestPush().then(() => process.exit(0));
