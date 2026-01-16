import dotenv from 'dotenv';
dotenv.config();

export default {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000'),
    host: process.env.HOST || '0.0.0.0',

    database: {
        url: process.env.DATABASE_URL || 'postgresql://localhost:5432/memory_os'
    },

    gemini: {
        apiKey: process.env.GEMINI_API_KEY,
        model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-lite'  // Cost-efficient model
    },

    googleCloud: {
        credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        apiKey: process.env.GOOGLE_CLOUD_API_KEY
    },

    firebase: {
        serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH
    },

    // Computed properties
    get isDev() { return this.env === 'development' || this.env === 'test'; },
    get isProd() { return this.env === 'production'; }
};
