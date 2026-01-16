import { jest, describe, test, expect, beforeEach } from '@jest/globals';

jest.unstable_mockModule('../../src/db/index.js', () => ({
    default: {
        query: jest.fn()
    }
}));

const { default: FinanceModule } = await import('../../src/modules/finance/finance.module.js');
const { default: db } = await import('../../src/db/index.js');

describe('FinanceModule', () => {
    let module;

    beforeEach(() => {
        console.log('DEBUG: db object:', db);
        console.log('DEBUG: db.query type:', typeof db.query);
        module = new FinanceModule();
        jest.clearAllMocks();
    });

    describe('Module Initialization', () => {
        test('should initialize with correct metadata', () => {
            expect(module.category).toBe('finance');
            expect(module.name).toBe('Finance & Money');
            expect(module.version).toBe('1.0.0');
        });

        test('should have correct capabilities', () => {
            const metadata = module.getMetadata();
            expect(metadata.capabilities.processMemory).toBe(true);
            expect(metadata.capabilities.transactionTracking).toBe(true);
            expect(metadata.capabilities.categoryDetection).toBe(true);
        });

        test('should have supported spending categories', () => {
            const metadata = module.getMetadata();
            expect(metadata.supportedCategories).toContain('food');
            expect(metadata.supportedCategories).toContain('transport');
            expect(metadata.supportedCategories).toContain('shopping');
        });
    });

    describe('detectSpendingCategory()', () => {
        test('should detect food category', () => {
            expect(module.detectSpendingCategory({ subcategory: 'restaurant' })).toBe('food');
            expect(module.detectSpendingCategory({ item: 'groceries' })).toBe('food');
            expect(module.detectSpendingCategory({ note: 'dinner at cafe' })).toBe('food');
        });

        test('should detect transport category', () => {
            expect(module.detectSpendingCategory({ subcategory: 'uber ride' })).toBe('transport');
            expect(module.detectSpendingCategory({ item: 'metro card' })).toBe('transport');
            expect(module.detectSpendingCategory({ note: 'petrol for car' })).toBe('transport');
        });

        test('should detect shopping category', () => {
            expect(module.detectSpendingCategory({ subcategory: 'Amazon purchase' })).toBe('shopping');
            expect(module.detectSpendingCategory({ item: 'new shirt' })).toBe('shopping');
        });

        test('should detect entertainment category', () => {
            expect(module.detectSpendingCategory({ item: 'movie tickets' })).toBe('entertainment');
            expect(module.detectSpendingCategory({ subcategory: 'Netflix subscription' })).toBe('entertainment');
        });

        test('should default to other for unknown categories', () => {
            expect(module.detectSpendingCategory({ item: 'random stuff' })).toBe('other');
        });
    });

    describe('processMemory()', () => {
        test('should process expense transaction successfully', async () => {
            db.query
                .mockResolvedValueOnce({ rows: [{ count: '25', total: '15000' }] }) // getMonthlySpending
                .mockResolvedValueOnce({ rows: [{ category: 'food', total: '5000' }] }); // getTopSpendingCategory

            const memory = {
                user_id: 'test-user',
                normalized_data: {
                    amount: -500,
                    subcategory: 'food'
                }
            };

            const result = await module.processMemory(memory);

            expect(result.processed).toBe(true);
            expect(result.transactionType).toBe('expense');
            expect(result.amount).toBe(500);
            expect(result.spendingCategory).toBe('food');
            expect(result.monthlyTotal).toBe(15000);
        });

        test('should process income transaction', async () => {
            db.query
                .mockResolvedValueOnce({ rows: [{ count: '10', total: '5000' }] })
                .mockResolvedValueOnce({ rows: [] });

            const memory = {
                user_id: 'test-user',
                normalized_data: {
                    amount: 50000,
                    subcategory: 'salary'
                }
            };

            const result = await module.processMemory(memory);

            expect(result.processed).toBe(true);
            expect(result.transactionType).toBe('income');
            expect(result.amount).toBe(50000);
        });

        test('should handle missing amount gracefully', async () => {
            const memory = {
                user_id: 'test-user',
                normalized_data: {}
            };

            const result = await module.processMemory(memory);

            expect(result.processed).toBe(false);
            expect(result.message).toBe('No amount identified');
        });

        test('should handle database errors', async () => {
            db.query.mockRejectedValue(new Error('DB error'));

            const memory = {
                user_id: 'test-user',
                normalized_data: { amount: -100 }
            };

            const result = await module.processMemory(memory);

            expect(result.processed).toBe(false);
            expect(result.error).toBe('DB error');
        });
    });

    describe('generateInsights()', () => {
        test('should generate high spending alert', async () => {
            db.query.mockResolvedValueOnce({
                rows: [{ count: '50', total: '75000' }]
            });

            const insights = await module.generateInsights('test-user');

            expect(insights.length).toBeGreaterThan(0);
            expect(insights[0].type).toBe('alert');
            expect(insights[0].category).toBe('finance');
            expect(insights[0].title).toBe('High Spending Month');
        });

        test('should return empty insights for normal spending', async () => {
            db.query.mockResolvedValueOnce({
                rows: [{ count: '20', total: '30000' }]
            });

            const insights = await module.generateInsights('test-user');

            // Should not generate alert for spending under threshold
            const highSpendingAlerts = insights.filter(i => i.type === 'alert');
            expect(highSpendingAlerts.length).toBe(0);
        });
    });

    describe('getMonthlySpending()', () => {
        test('should calculate monthly spending correctly', async () => {
            db.query.mockResolvedValueOnce({
                rows: [{ count: '15', total: '12500.50' }]
            });

            const result = await module.getMonthlySpending('test-user');

            expect(result.count).toBe(15);
            expect(result.total).toBe(12500.50);
        });

        test('should handle no transactions', async () => {
            db.query.mockResolvedValueOnce({
                rows: [{ count: null, total: null }]
            });

            const result = await module.getMonthlySpending('test-user');

            expect(result.count).toBe(0);
            expect(result.total).toBe(0);
        });
    });
});
