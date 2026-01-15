import CategoryModule from '../base/CategoryModule.js';
import db from '../../db/index.js';

/**
 * Finance Module
 * 
 * Handles financial transactions and money tracking:
 * - Income and expense tracking
 * - Category auto-detection
 * - Spending patterns
 * - Budget insights
 * - Balance tracking
 */
class FinanceModule extends CategoryModule {
    constructor() {
        super({
            category: 'finance',
            name: 'Finance & Money',
            version: '1.0.0'
        });
    }

    /**
     * Process finance memory
     * Categorizes transactions, tracks spending patterns
     */
    async processMemory(memoryUnit) {
        const { user_id, normalized_data } = memoryUnit;
        const amount = normalized_data.amount;

        if (!amount) {
            return { processed: false, message: 'No amount identified' };
        }

        try {
            const results = {};

            // 1. Detect transaction type (income vs expense)
            const transactionType = amount > 0 ? 'income' : 'expense';
            results.transactionType = transactionType;
            results.amount = Math.abs(amount);

            // 2. Detect spending category
            const category = this.detectSpendingCategory(normalized_data);
            results.spendingCategory = category;

            // 3. Calculate monthly spending
            const monthlySpending = await this.getMonthlySpending(user_id);
            results.monthlyTotal = monthlySpending.total;
            results.transactionCount = monthlySpending.count;

            // 4. Get category breakdown
            const topCategory = await this.getTopSpendingCategory(user_id);
            if (topCategory) {
                results.topCategory = topCategory.category;
                results.topCategoryAmount = topCategory.total;
            }

            return {
                processed: true,
                ...results,
                message: `Tracked ${transactionType} of ₹${Math.abs(amount)}`
            };
        } catch (error) {
            console.error('Finance processing error:', error);
            return { processed: false, error: error.message };
        }
    }

    /**
     * Detect spending category from transaction description
     */
    detectSpendingCategory(data) {
        const text = (data.subcategory || data.item || data.note || '').toLowerCase();

        if (text.match(/food|restaurant|cafe|dinner|lunch|breakfast|meal|groceries?/)) {
            return 'food';
        }
        if (text.match(/transport|uber|taxi|bus|train|metro|fuel|petrol|gas/)) {
            return 'transport';
        }
        if (text.match(/shopping|clothes|shirt|shoes|amazon|flipkart/)) {
            return 'shopping';
        }
        if (text.match(/entertainment|movie|netflix|spotify|game/)) {
            return 'entertainment';
        }
        if (text.match(/health|medicine|doctor|hospital|pharmacy/)) {
            return 'health';
        }
        if (text.match(/utility|electricity|water|internet|phone|bill/)) {
            return 'utilities';
        }
        if (text.match(/rent|mortgage|emi/)) {
            return 'housing';
        }

        return 'other';
    }

    /**
     * Get monthly spending total
     */
    async getMonthlySpending(userId) {
        const query = `
      SELECT 
        COUNT(*) as count,
        SUM(ABS((normalized_data->>'amount')::numeric)) as total
      FROM memory_units
      WHERE user_id = $1
        AND category = 'finance'
        AND status = 'validated'
        AND (normalized_data->>'amount')::numeric < 0
        AND created_at >= DATE_TRUNC('month', NOW())
    `;

        const result = await db.query(query, [userId]);
        return {
            count: parseInt(result.rows[0].count) || 0,
            total: parseFloat(result.rows[0].total) || 0
        };
    }

    /**
     * Get top spending category this month
     */
    async getTopSpendingCategory(userId) {
        const query = `
      SELECT 
        normalized_data->>'subcategory' as category,
        SUM(ABS((normalized_data->>'amount')::numeric)) as total
      FROM memory_units
      WHERE user_id = $1
        AND category = 'finance'
        AND status = 'validated'
        AND (normalized_data->>'amount')::numeric < 0
        AND created_at >= DATE_TRUNC('month', NOW())
      GROUP BY normalized_data->>'subcategory'
      ORDER BY total DESC
      LIMIT 1
    `;

        const result = await db.query(query, [userId]);

        if (result.rows.length === 0) {
            return null;
        }

        return {
            category: result.rows[0].category,
            total: parseFloat(result.rows[0].total)
        };
    }

    /**
     * Generate finance-specific insights
     */
    async generateInsights(userId, timeRange = {}) {
        const insights = [];

        // 1. High spending alerts
        const spending = await this.analyzeSpending(userId);
        if (spending.insight) {
            insights.push(spending.insight);
        }

        // 2. Category trends
        const trends = await this.analyzeCategoryTrends(userId);
        if (trends.length > 0) {
            insights.push(...trends);
        }

        return insights;
    }

    async analyzeSpending(userId) {
        const monthly = await this.getMonthlySpending(userId);

        if (monthly.total > 50000) { // Configurable threshold
            return {
                insight: {
                    type: 'alert',
                    category: 'finance',
                    title: 'High Spending Month',
                    description: `You've spent ₹${monthly.total.toLocaleString('en-IN')} this month across ${monthly.count} transactions`,
                    priority: 'high'
                }
            };
        }

        return {};
    }

    async analyzeCategoryTrends(userId) {
        // TODO: Implement category trend analysis
        return [];
    }

    /**
     * Get module capabilities
     */
    getMetadata() {
        return {
            ...super.getMetadata(),
            capabilities: {
                processMemory: true,
                generateInsights: true,
                generatePlans: false,
                guidedSessions: false,
                transactionTracking: true,
                categoryDetection: true,
                spendingAnalysis: true
            },
            supportedCategories: [
                'food', 'transport', 'shopping', 'entertainment',
                'health', 'utilities', 'housing', 'other'
            ]
        };
    }
}

export default FinanceModule;
