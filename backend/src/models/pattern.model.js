import db from '../db/index.js';

class PatternModel {
    /**
     * Create or update a pattern
     */
    static async upsert(patternData) {
        const {
            userId,
            category,
            patternType,
            description,
            insight,
            supportingMemories,
            confidenceScore,
            isActionable
        } = patternData;

        // Check if pattern already exists (ignoring status)
        const existing = await this.findAnyByTypeAndCategory(userId, patternType, category);

        if (existing) {
            // Update existing pattern
            const query = `
        UPDATE patterns
        SET description = $1,
            insight = $2,
            supporting_memories = $3,
            confidence_score = $4,
            last_validated_at = NOW(),
            is_actionable = $5
        WHERE id = $6
        RETURNING *
      `;

            const result = await db.query(query, [
                description,
                insight || '',
                supportingMemories || [],
                confidenceScore,
                isActionable || false,
                existing.id
            ]);

            return result.rows[0];
        } else {
            // Create new pattern
            const query = `
        INSERT INTO patterns (
          user_id, category, pattern_type, description, insight,
          supporting_memories, confidence_score, is_actionable
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

            const result = await db.query(query, [
                userId,
                category,
                patternType,
                description,
                insight || '',
                supportingMemories || [],
                confidenceScore,
                isActionable || false
            ]);

            return result.rows[0];
        }
    }

    /**
     * Find pattern by type and category (Active Only)
     */
    static async findByTypeAndCategory(userId, patternType, category) {
        const query = `
      SELECT * FROM patterns
      WHERE user_id = $1 
        AND pattern_type = $2
        AND category = $3
        AND status = 'active'
      ORDER BY last_validated_at DESC
      LIMIT 1
    `;

        const result = await db.query(query, [userId, patternType, category]);
        return result.rows[0];
    }

    /**
     * Find pattern by type and category (Any Status)
     */
    static async findAnyByTypeAndCategory(userId, patternType, category) {
        const query = `
      SELECT * FROM patterns
      WHERE user_id = $1 
        AND pattern_type = $2
        AND category = $3
      ORDER BY last_validated_at DESC
      LIMIT 1
    `;

        const result = await db.query(query, [userId, patternType, category]);
        return result.rows[0];
    }

    /**
     * Get all active patterns for user
     */
    static async findByUser(userId, filters = {}) {
        let query = `
      SELECT * FROM patterns
      WHERE user_id = $1 AND status = 'active'
    `;
        const values = [userId];
        let paramIndex = 2;

        if (filters.category) {
            query += ` AND category = $${paramIndex}`;
            values.push(filters.category);
            paramIndex++;
        }

        if (filters.patternType) {
            query += ` AND pattern_type = $${paramIndex}`;
            values.push(filters.patternType);
            paramIndex++;
        }

        query += ' ORDER BY confidence_score DESC, last_validated_at DESC';

        const result = await db.query(query, values);
        return result.rows;
    }

    /**
     * Delete old/stale patterns
     */
    static async cleanupStale(userId, daysOld = 30) {
        const query = `
      UPDATE patterns
      SET status = 'dismissed'
      WHERE user_id = $1
        AND last_validated_at < NOW() - INTERVAL '${daysOld} days'
        AND status = 'active'
      RETURNING id
    `;

        const result = await db.query(query, [userId]);
        return result.rows.length;
    }

    /**
     * Dismiss a specific pattern
     */
    static async dismiss(patternId, userId) {
        const query = `
            UPDATE patterns
            SET status = 'dismissed'
            WHERE id = $1 AND user_id = $2
            RETURNING *
        `;
        const result = await db.query(query, [patternId, userId]);
        return result.rows[0];
    }
}

export default PatternModel;
