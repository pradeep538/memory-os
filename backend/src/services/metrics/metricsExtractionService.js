import db from '../../db/index.js';

/**
 * Metrics Extraction Service
 * Extracts quantifiable data from memory_units and stores in metrics table
 */
class MetricsExtractionService {
    /**
     * Extract metrics from a memory unit
     */
    async extractAndStoreMetrics(memoryId, userId, category, normalizedData, createdAt) {
        try {
            const metrics = this.extractMetrics(category, normalizedData, createdAt);

            if (!metrics) {
                return null; // No quantifiable data to extract
            }

            // Store in metrics table
            return await this.storeMetrics(memoryId, userId, category, metrics);

        } catch (error) {
            console.error('Error extracting metrics:', error);
            throw error;
        }
    }

    /**
     * Extract quantifiable metrics based on category
     */
    extractMetrics(category, normalizedData, createdAt) {
        switch (category) {
            case 'fitness':
                return this.extractFitnessMetrics(normalizedData, createdAt);
            case 'finance':
                return this.extractFinanceMetrics(normalizedData, createdAt);
            case 'routine':
            case 'health':
                return this.extractRoutineMetrics(normalizedData, createdAt);
            default:
                return null;
        }
    }

    /**
     * Extract fitness metrics
     */
    extractFitnessMetrics(data, createdAt) {
        const metrics = {
            metric_date: new Date(createdAt).toISOString().split('T')[0],
            metric_time: new Date(createdAt).toTimeString().split(' ')[0],
            tags: []
        };

        // Extract duration
        if (data.duration) {
            metrics.metric_type = 'workout';
            metrics.duration_minutes = parseInt(data.duration);
            metrics.numeric_value = parseInt(data.duration);
            metrics.unit = 'minutes';
        }

        // Extract reps/sets
        if (data.amount && data.activity) {
            metrics.metric_type = 'exercise';
            metrics.numeric_value = parseInt(data.amount);
            metrics.unit = 'reps';
            metrics.tags.push(data.activity);
        }

        // Extract tags from activity
        if (data.activity) {
            const activityTags = data.activity.toLowerCase().split(/[\s,]+/);
            metrics.tags.push(...activityTags.slice(0, 3)); // Max 3 tags
        }

        // Add subcategory as tag
        if (data.subcategory) {
            const subTags = data.subcategory.toLowerCase().split(/[\s,]+/);
            metrics.tags.push(...subTags.slice(0, 2));
        }

        // Default if no specific quantitative metric found
        if (!metrics.metric_type) {
            metrics.metric_type = 'workout_log';
            metrics.numeric_value = 1;
            metrics.unit = 'count';
        }

        return metrics;
    }

    /**
     * Extract finance metrics
     */
    extractFinanceMetrics(data, createdAt) {
        if (!data.amount) {
            return null; // No quantifiable amount
        }

        const metrics = {
            metric_type: 'expense',
            metric_date: new Date(createdAt).toISOString().split('T')[0],
            metric_time: new Date(createdAt).toTimeString().split(' ')[0],
            numeric_value: parseFloat(data.amount),
            unit: 'INR',
            frequency_count: 1,
            tags: []
        };

        // Add subcategory as tag
        if (data.subcategory) {
            metrics.tags.push(data.subcategory.toLowerCase());
        }

        // Add item as tag
        if (data.item) {
            const itemTags = data.item.toLowerCase().split(/[\s,]+/);
            metrics.tags.push(...itemTags.slice(0, 2));
        }

        return metrics;
    }

    /**
     * Extract routine/health metrics
     */
    extractRoutineMetrics(data, createdAt) {
        const metrics = {
            metric_type: 'habit_completion',
            metric_date: new Date(createdAt).toISOString().split('T')[0],
            metric_time: new Date(createdAt).toTimeString().split(' ')[0],
            numeric_value: 1, // Boolean: did it
            frequency_count: 1,
            tags: []
        };

        // Extract activity/item name as tags
        if (data.activity) {
            const activityTags = data.activity.toLowerCase().split(/[\s,]+/);
            metrics.tags.push(...activityTags.slice(0, 3));
        }

        if (data.item) {
            const itemTags = data.item.toLowerCase().split(/[\s,]+/);
            metrics.tags.push(...itemTags.slice(0, 2));
        }

        return metrics;
    }

    /**
     * Store metrics in database
     */
    async storeMetrics(memoryId, userId, category, metricsData) {
        const query = `
      INSERT INTO metrics (
        user_id,
        memory_id,
        category,
        metric_type,
        numeric_value,
        unit,
        duration_minutes,
        frequency_count,
        metric_date,
        metric_time,
        tags
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

        const values = [
            userId,
            memoryId,
            category,
            metricsData.metric_type,
            metricsData.numeric_value || null,
            metricsData.unit || null,
            metricsData.duration_minutes || null,
            metricsData.frequency_count || 1,
            metricsData.metric_date,
            metricsData.metric_time || null,
            metricsData.tags || []
        ];

        const result = await db.query(query, values);
        return result.rows[0];
    }

    /**
     * Get metrics for a user
     */
    async getUserMetrics(userId, category = null, startDate = null, endDate = null) {
        let query = `
      SELECT *
      FROM metrics
      WHERE user_id = $1
    `;

        const params = [userId];
        let paramIndex = 2;

        if (category) {
            query += ` AND category = $${paramIndex}`;
            params.push(category);
            paramIndex++;
        }

        if (startDate) {
            query += ` AND metric_date >= $${paramIndex}`;
            params.push(startDate);
            paramIndex++;
        }

        if (endDate) {
            query += ` AND metric_date <= $${paramIndex}`;
            params.push(endDate);
            paramIndex++;
        }

        query += ' ORDER BY metric_date DESC, metric_time DESC';

        const result = await db.query(query, params);
        return result.rows;
    }

    /**
     * Calculate aggregations
     */
    async getAggregatedMetrics(userId, category, metricType, startDate, endDate, aggregation = 'SUM') {
        const query = `
      SELECT 
        ${aggregation}(numeric_value) as value,
        COUNT(*) as count,
        MIN(metric_date) as period_start,
        MAX(metric_date) as period_end
      FROM metrics
      WHERE user_id = $1
        AND category = $2
        AND metric_type = $3
        AND metric_date >= $4
        AND metric_date <= $5
    `;

        const result = await db.query(query, [userId, category, metricType, startDate, endDate]);
        return result.rows[0];
    }
}

export default new MetricsExtractionService();
