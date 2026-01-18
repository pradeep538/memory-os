import admin from 'firebase-admin';
import config from '../config/index.js';
import UserModel from '../models/user.model.js';
import db from '../db/index.js'; // Added db import
import fs from 'fs';

// Initialize Firebase Admin SDK
let firebaseInitialized = false;

function initializeFirebase() {
    if (firebaseInitialized) return;

    try {
        console.log('🔍 Checking Firebase config...', {
            hasPath: !!config.firebase?.serviceAccountPath,
            path: config.firebase?.serviceAccountPath
        });

        // Check if service account JSON file path is provided
        if (config.firebase?.serviceAccountPath) {
            console.log('📂 Loading from file:', config.firebase.serviceAccountPath);
            const serviceAccount = JSON.parse(
                fs.readFileSync(config.firebase.serviceAccountPath, 'utf8')
            );
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
        // Check if service account JSON is provided directly in env
        else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            console.log('📝 Loading from env FIREBASE_SERVICE_ACCOUNT');
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
        // Use application default credentials (for Cloud Run, etc.)
        else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            admin.initializeApp({
                credential: admin.credential.applicationDefault()
            });
        }
        // Development mode - skip auth
        else {
            console.warn('⚠️  Firebase not configured - auth middleware will use demo user');
            firebaseInitialized = true;
            return;
        }

        firebaseInitialized = true;
        console.log('✅ Firebase Admin initialized');
    } catch (error) {
        console.error('❌ Firebase initialization failed:', error.message);
        console.warn('⚠️  Auth middleware will use demo user');
        firebaseInitialized = true;
    }
}

// Demo user ID for development
const DEMO_USER_ID = 'c3d50e53-701f-4fc7-bd57-e84e0663fb3a'; // geetamg538

/**
 * Authentication middleware
 * Verifies Firebase ID token and extracts user ID
 */
export async function authenticate(request, reply) {
    // Initialize Firebase on first request
    if (!firebaseInitialized) {
        initializeFirebase();
    }

    const authHeader = request.headers.authorization;

    // No auth header - reject in production, allow demo in dev
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        if (config.isDev) {
            // Allow override via header for testing multiple scenarios
            const demoOverride = request.headers['x-demo-user-id'];

            if (demoOverride) {
                // Ensure this demo user exists in the DB to satisfy FK constraints
                try {
                    const userCheck = await db.query('SELECT id FROM users WHERE id = $1', [demoOverride]);
                    if (userCheck.rows.length === 0) {
                        request.log.info(`Creating temp demo user: ${demoOverride}`);
                        // Insert with specific UUID
                        await db.query(
                            `INSERT INTO users (id, username, email, subscription_tier, firebase_uid, active_categories)
                             VALUES ($1, $2, $3, 'free', $4, $5)`,
                            [
                                demoOverride,
                                `demo_${demoOverride.substring(0, 8)}`,
                                `demo_${demoOverride.substring(0, 8)}@test.com`,
                                `firebase_${demoOverride}`,
                                '{}'
                            ]
                        );
                    }
                    request.userId = demoOverride;
                } catch (err) {
                    request.log.error(`Failed to create demo user: ${err.message}`);
                    request.userId = DEMO_USER_ID;
                }
            } else {
                request.userId = DEMO_USER_ID;
            }

            request.log.debug(`Using demo user (no auth header in dev mode): ${request.userId}`);
            return;
        }
        return reply.code(401).send({
            success: false,
            error: 'Authorization header required',
            code: 'AUTH_REQUIRED'
        });
    }

    const token = authHeader.split(' ')[1];

    // Check if Firebase is properly initialized
    if (!admin.apps.length) {
        if (config.isDev) {
            request.userId = DEMO_USER_ID;
            request.log.debug('Using demo user (Firebase not initialized)');
            return;
        }
        return reply.code(500).send({
            success: false,
            error: 'Authentication service not configured',
            code: 'AUTH_NOT_CONFIGURED'
        });
    }

    try {
        // Verify the Firebase ID token
        const decodedToken = await admin.auth().verifyIdToken(token);
        const firebaseUid = decodedToken.uid;

        // Find or create user in Postgres
        let user = await UserModel.findByFirebaseUid(firebaseUid);

        if (!user) {
            request.log.info(`Creating new user for Firebase UID: ${firebaseUid}`);
            user = await UserModel.create({
                firebaseUid: firebaseUid,
                email: decodedToken.email,
                username: decodedToken.name || `user_${firebaseUid.substring(0, 8)}`,
                subscriptionTier: 'free'
            });
        }

        // Set INTERNAL Postgres UUID on request object
        request.userId = user.id;
        request.userEmail = user.email;
        request.firebaseUid = firebaseUid; // Keep original for reference if needed

        request.log.debug(`Authenticated user: ${user.id} (Firebase: ${firebaseUid})`);
    } catch (error) {
        request.log.error({ err: error }, `Token verification failed: ${error.message}`);
        request.log.debug(`Failed token (start): ${token.substring(0, 20)}...`);

        // In development, fall back to demo user
        if (config.isDev) {
            request.userId = DEMO_USER_ID;
            request.log.debug('Using demo user (token verification failed in dev)');
            return;
        }

        // Token expired
        if (error.code === 'auth/id-token-expired') {
            return reply.code(401).send({
                success: false,
                error: 'Token expired. Please sign in again.',
                code: 'TOKEN_EXPIRED'
            });
        }

        // Invalid token
        return reply.code(401).send({
            success: false,
            error: 'Invalid authentication token',
            code: 'INVALID_TOKEN'
        });
    }
}

/**
 * Optional authentication middleware
 * Sets user ID if token is valid, uses demo user otherwise
 * Does not reject requests without auth
 */
export async function optionalAuth(request, reply) {
    // Initialize Firebase on first request
    if (!firebaseInitialized) {
        initializeFirebase();
    }

    const authHeader = request.headers.authorization;

    // No auth header - use demo user
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        const demoOverride = request.headers['x-demo-user-id'];
        request.userId = demoOverride || DEMO_USER_ID;
        return;
    }

    const token = authHeader.split(' ')[1];

    // Check if Firebase is initialized
    if (!admin.apps.length) {
        request.userId = DEMO_USER_ID;
        return;
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        request.userId = decodedToken.uid;
        request.userEmail = decodedToken.email;
    } catch (error) {
        // Fall back to demo user on any error
        request.userId = DEMO_USER_ID;
        request.log.debug('Using demo user (optional auth failed)');
    }
}

export default { authenticate, optionalAuth };
