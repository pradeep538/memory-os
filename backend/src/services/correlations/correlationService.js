import db from '../../db/index.js';

/**
 * Correlation Service
 * Calculates and manages statistical correlations between metrics
 */
class CorrelationService {
    /**
     * Get all correlations for a user
     */
    async getUserCorrelations(userId, filters = {}) {
        let query = `
            SELECT 
                c.*,
                md1.display_name as driver_metric_name,
                md2.display_name as outcome_metric_name,
                md1.unit as driver_unit,
                md2.unit as outcome_unit
            FROM correlations c
            LEFT JOIN metric_definitions md1 ON c.driver_metric_id = md1.id
            LEFT JOIN metric_definitions md2 ON c.outcome_metric_id = md2.id
            WHERE c.user_id = $1
        `;

        const params = [userId];
        let paramCount = 1;

        if (filters.status) {
            paramCount++;
            query += ` AND c.status = $${paramCount}`;
            params.push(filters.status);
        }

        if (filters.min_coefficient) {
            paramCount++;
            query += ` AND ABS(c.coefficient) >= $${paramCount}`;
            params.push(filters.min_coefficient);
        }

        if (filters.lag_days !== undefined) {
            paramCount++;
            query += ` AND c.lag_days = $${paramCount}`;
            params.push(filters.lag_days);
        }

        query += ` ORDER BY ABS(c.coefficient) DESC, c.detected_at DESC`;

        const limit = filters.limit || 50;
        query += ` LIMIT ${limit}`;

        const result = await db.query(query, params);
        return result.rows;
    }

    /**
     * Get correlation by ID
     */
    async getCorrelation(userId, correlationId) {
        const query = `
            SELECT 
                c.*,
                md1.display_name as driver_metric_name,
                md2.display_name as outcome_metric_name
            FROM correlations c
            LEFT JOIN metric_definitions md1 ON c.driver_metric_id = md1.id
            LEFT JOIN metric_definitions md2 ON c.outcome_metric_id = md2.id
            WHERE c.id = $1 AND c.user_id = $2
        `;

        const result = await db.query(query, [correlationId, userId]);

        if (result.rows.length === 0) {
            throw new Error('Correlation not found');
        }

        return result.rows[0];
    }

    /**
     * Calculate correlations for a user
     * This is a batch operation that analyzes all possible metric pairs
     */
    async calculateCorrelations(userId, options = {}) {
        const minSampleSize = options.minSampleSize || 14; // At least 2 weeks of data
        const significanceLevel = options.significanceLevel || 0.05; // p < 0.05
        const maxLagDays = options.maxLagDays || 3; // Check up to 3 days lag

        // Get all metric IDs that have data for this user
        const metricsQuery = `
            SELECT DISTINCT metric_id 
            FROM daily_metrics 
            WHERE user_id = $1
        `;
        const metricsResult = await db.query(metricsQuery, [userId]);
        const metricIds = metricsResult.rows.map(r => r.metric_id);

        const newCorrelations = [];

        // Calculate correlations for all pairs
        for (let i = 0; i < metricIds.length; i++) {
            for (let j = 0; j < metricIds.length; j++) {
                if (i === j) continue; // Skip self-correlation

                const driverMetricId = metricIds[i];
                const outcomeMetricId = metricIds[j];

                // Test different lag days
                for (let lag = 0; lag <= maxLagDays; lag++) {
                    try {
                        const correlation = await this.calculatePairCorrelation(
                            userId,
                            driverMetricId,
                            outcomeMetricId,
                            lag,
                            minSampleSize
                        );

                        if (correlation && Math.abs(correlation.coefficient) > 0.3 && correlation.p_value < significanceLevel) {
                            newCorrelations.push(correlation);
                        }
                    } catch (error) {
                        console.error(`Failed to calculate correlation: ${error.message}`);
                    }
                }
            }
        }

        return {
            calculated: newCorrelations.length,
            correlations: newCorrelations
        };
    }

    /**
     * Calculate correlation for a specific metric pair
     */
    async calculatePairCorrelation(userId, driverMetricId, outcomeMetricId, lagDays = 0, minSampleSize = 14) {
        // Fetch aligned data points
        const query = `
            WITH driver_data AS (
                SELECT date, val as driver_val
                FROM daily_metrics
                WHERE user_id = $1 AND metric_id = $2
            ),
            outcome_data AS (
                SELECT date, val as outcome_val
                FROM daily_metrics
                WHERE user_id = $1 AND metric_id = $3
            )
            SELECT 
                d.driver_val,
                o.outcome_val
            FROM driver_data d
            INNER JOIN outcome_data o ON o.date = d.date + INTERVAL '${lagDays} days'
            WHERE d.driver_val IS NOT NULL AND o.outcome_val IS NOT NULL
            ORDER BY d.date
        `;

        const result = await db.query(query, [userId, driverMetricId, outcomeMetricId]);

        if (result.rows.length < minSampleSize) {
            return null; // Not enough data
        }

        // Calculate Pearson correlation
        const correlation = this.calculatePearsonCorrelation(result.rows);

        // Insert or update correlation
        const insertQuery = `
            INSERT INTO correlations (
                user_id, driver_metric_id, outcome_metric_id,
                coefficient, p_value, sample_size, lag_days,
                data_points_count, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
            ON CONFLICT (user_id, driver_metric_id, outcome_metric_id, lag_days)
            DO UPDATE SET
                coefficient = EXCLUDED.coefficient,
                p_value = EXCLUDED.p_value,
                sample_size = EXCLUDED.sample_size,
                data_points_count = EXCLUDED.data_points_count,
                updated_at = NOW()
            RETURNING *
        `;

        const insertResult = await db.query(insertQuery, [
            userId,
            driverMetricId,
            outcomeMetricId,
            correlation.coefficient,
            correlation.pValue,
            result.rows.length,
            lagDays,
            result.rows.length
        ]);

        return insertResult.rows[0];
    }

    /**
     * Calculate Pearson correlation coefficient
     */
    calculatePearsonCorrelation(dataPoints) {
        const n = dataPoints.length;

        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

        for (const point of dataPoints) {
            const x = parseFloat(point.driver_val);
            const y = parseFloat(point.outcome_val);

            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumX2 += x * x;
            sumY2 += y * y;
        }

        const numerator = (n * sumXY) - (sumX * sumY);
        const denominator = Math.sqrt(((n * sumX2) - (sumX * sumX)) * ((n * sumY2) - (sumY * sumY)));

        const coefficient = denominator === 0 ? 0 : numerator / denominator;

        // Simple p-value estimation (for proper implementation, use t-distribution)
        const t = coefficient * Math.sqrt((n - 2) / (1 - coefficient * coefficient));
        const pValue = Math.max(0.001, Math.min(0.999, 2 * (1 - this.normalCDF(Math.abs(t)))));

        return {
            coefficient: Math.round(coefficient * 1000) / 1000,
            pValue: Math.round(pValue * 100000) / 100000
        };
    }

    /**
     * Simple normal CDF approximation
     */
    normalCDF(x) {
        const t = 1 / (1 + 0.2316419 * Math.abs(x));
        const d = 0.3989423 * Math.exp(-x * x / 2);
        const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
        return x > 0 ? 1 - prob : prob;
    }

    /**
     * Update correlation status
     */
    async updateCorrelationStatus(userId, correlationId, status) {
        const query = `
            UPDATE correlations
            SET status = $1, updated_at = NOW()
            WHERE id = $2 AND user_id = $3
            RETURNING *
        `;

        const result = await db.query(query, [status, correlationId, userId]);

        if (result.rows.length === 0) {
            throw new Error('Correlation not found');
        }

        return result.rows[0];
    }

    /**
     * Submit feedback on correlation
     */
    async submitFeedback(userId, correlationId, feedbackType, comment = null) {
        const query = `
            INSERT INTO correlation_feedback (
                correlation_id, user_id, feedback_type, user_comment
            )
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;

        const result = await db.query(query, [correlationId, userId, feedbackType, comment]);
        return result.rows[0];
    }

    /**
     * Get correlation statistics
     */
    async getCorrelationStats(userId) {
        const query = `
            SELECT 
                COUNT(*) as total_correlations,
                COUNT(*) FILTER (WHERE status = 'active') as active,
                COUNT(*) FILTER (WHERE status = 'pinned') as pinned,
                COUNT(*) FILTER (WHERE ABS(coefficient) > 0.7) as strong,
                COUNT(*) FILTER (WHERE ABS(coefficient) BETWEEN 0.4 AND 0.7) as moderate,
                AVG(ABS(coefficient)) as avg_strength
            FROM correlations
            WHERE user_id = $1
        `;

        const result = await db.query(query, [userId]);
        return result.rows[0];
    }

    /**
     * Get available metrics (optionally filtered by category)
     */
    async getAvailableMetrics(category = null) {
        let query = `
            SELECT 
                id,
                name,
                display_name,
                category,
                unit,
                data_type
            FROM metric_definitions
        `;

        const params = [];

        if (category) {
            query += ` WHERE category = $1`;
            params.push(category);
        }

        query += ` ORDER BY category, display_name`;

        const result = await db.query(query, params);
        return result.rows;
    }
}

export default new CorrelationService();
