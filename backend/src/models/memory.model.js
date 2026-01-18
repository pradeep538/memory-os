import db from '../db/index.js';

class MemoryModel {
    /**
     * Create a new memory unit
     */
    static async create(memoryData) {
        const { userId, rawInput, source, eventType, category, normalizedData, confidenceScore, status } = memoryData;

        const query = `
      INSERT INTO memory_units (
        user_id, raw_input, source, event_type, category, 
        normalized_data, confidence_score, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

        const values = [
            userId,
            rawInput,
            source || 'text',
            eventType,
            category,
            normalizedData || {},
            confidenceScore,
            status || 'tentative'
        ];

        const result = await db.query(query, values);
        const memory = result.rows[0];

        // Auto-extract metrics in background
        setImmediate(async () => {
            try {
                const metricsService = (await import('../services/metrics/metricsExtractionService.js')).default;
                await metricsService.extractAndStoreMetrics(
                    memory.id,
                    userId,
                    category,
                    normalizedData || {},
                    memory.created_at
                );
                console.log(`✅ Metrics extracted for memory ${memory.id}`);
            } catch (error) {
                console.error('❌ Metrics extraction failed:', error.message);
            }
        });

        return memory;
    }

    /**
     * Get memory by ID
     */
    static async findById(id, userId) {
        if (!userId) {
            const query = `SELECT * FROM memory_units WHERE id = $1`;
            const result = await db.query(query, [id]);
            return result.rows[0];
        }

        const query = `
      SELECT * FROM memory_units
      WHERE id = $1 AND user_id = $2
    `;
        const result = await db.query(query, [id, userId]);
        return result.rows[0];
    }

    /**
     * Get user memories with filters
     */
    static async findByUser(userId, filters = {}) {
        let query = 'SELECT * FROM memory_units WHERE user_id = $1';
        const values = [userId];
        let paramIndex = 2;

        // Category filter
        if (filters.category) {
            query += ` AND category = $${paramIndex}`;
            values.push(filters.category);
            paramIndex++;
        }

        // Event type filter
        if (filters.eventType) {
            query += ` AND event_type = $${paramIndex}`;
            values.push(filters.eventType);
            paramIndex++;
        }

        // Date range filter
        if (filters.startDate) {
            query += ` AND created_at >= $${paramIndex}`;
            values.push(filters.startDate);
            paramIndex++;
        }

        if (filters.endDate) {
            query += ` AND created_at < $${paramIndex}`;
            values.push(filters.endDate);
            paramIndex++;
        }

        // Pagination
        query += ' ORDER BY created_at DESC';

        if (filters.limit) {
            query += ` LIMIT $${paramIndex}`;
            values.push(filters.limit);
            paramIndex++;
        }

        if (filters.offset) {
            query += ` OFFSET $${paramIndex}`;
            values.push(filters.offset);
            paramIndex++;
        }

        const result = await db.query(query, values);
        return result.rows;
    }

    static async updateStatus(id, userId, status) {
        const query = `
      UPDATE memory_units
      SET status = $1
      WHERE id = $2 AND user_id = $3
      RETURNING *
    `;
        const result = await db.query(query, [status, id, userId]);
        return result.rows[0];
    }

    /**
     * Update memory with enhancement results
     */
    static async updateEnhancement(id, userId, data) {
        const { rawInput, category, normalizedData, confidenceScore, status } = data;
        const query = `
            UPDATE memory_units
            SET 
                raw_input = COALESCE($1, raw_input),
                category = COALESCE($2, category),
                normalized_data = $3,
                confidence_score = $4,
                status = $5,
                updated_at = NOW()
            WHERE id = $6 AND user_id = $7
            RETURNING *
        `;
        const values = [
            rawInput,
            category,
            normalizedData || {},
            confidenceScore,
            status,
            id,
            userId
        ];
        const result = await db.query(query, values);
        return result.rows[0];
    }

    /**
     * Create a correction memory
     */
    static async createCorrection(originalId, userId, correctedData) {
        const query = `
      INSERT INTO memory_units (
        user_id, raw_input, source, event_type, category,
        normalized_data, confidence_score, status,
        corrected_by, is_correction
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

        const values = [
            userId,
            correctedData.rawInput,
            correctedData.source || 'correction',
            correctedData.eventType,
            correctedData.category,
            correctedData.normalizedData,
            1.0, // Corrections have max confidence
            'validated',
            originalId,
            true
        ];

        const result = await db.query(query, values);

        // Mark original as corrected
        await this.updateStatus(originalId, userId, 'corrected');

        return result.rows[0];
    }

    /**
     * Get memories needing background processing
     * Status: 'processing' or 'transcribed' or 'failed_enhancement'
     */
    static async findPendingProcessing(limit = 10) {
        const query = `
            SELECT * FROM memory_units
            WHERE status IN ('processing', 'transcribed', 'failed_enhancement')
            ORDER BY created_at ASC
            LIMIT $1
        `;
        const result = await db.query(query, [limit]);
        return result.rows;
    }

    /**
     * Get memory count by category for a user
     */
    static async getCountByCategory(userId) {
        const query = `
            SELECT category, COUNT(*) as count 
            FROM memory_units 
            WHERE user_id = $1 AND status != 'deleted'
            GROUP BY category
            ORDER BY count DESC
        `;
        const result = await db.query(query, [userId]);

        // Convert to Map<string, number>
        const stats = {};
        result.rows.forEach(row => {
            stats[row.category] = parseInt(row.count);
        });

        return stats;
    }
}
export default MemoryModel;
