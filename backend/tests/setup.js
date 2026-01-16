import db from '../src/db/index.js';

// Test setup - runs before all tests
beforeAll(async () => {
    console.log('🧪 Setting up test environment...');

    // Connect to test database
    try {
        await db.query('SELECT 1');
        console.log('✅ Test database connected');
    } catch (error) {
        console.error('❌ Test database connection failed:', error.message);
        throw error;
    }
});

// Cleanup after all tests
afterAll(async () => {
    console.log('🧹 Cleaning up test environment...');

    // Close database connections
    await db.end();

    console.log('✅ Test cleanup complete');
});

// Setup for each test
beforeEach(async () => {
    // Optional: Add per-test setup here
});

// Cleanup after each test
afterEach(async () => {
    // Optional: Add per-test cleanup here
});

// Global test utilities
global.testUtils = {
    // Demo user ID for testing
    DEMO_USER_ID: '00000000-0000-0000-0000-000000000000',

    // Helper to generate test user ID
    generateUserId: () => {
        return crypto.randomUUID();
    },

    // Helper to wait for async operations
    sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
};
