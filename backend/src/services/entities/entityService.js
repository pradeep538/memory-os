import db from '../../db/index.js';

/**
 * Entity Service
 * CRUD operations for entities
 */
class EntityService {
    /**
     * Get all entities for a user
     */
    async getUserEntities(userId, filters = {}) {
        let query = `
            SELECT * FROM entities
            WHERE user_id = $1
        `;

        const params = [userId];
        let paramCount = 1;

        // Apply filters
        if (filters.entity_type) {
            paramCount++;
            query += ` AND entity_type = $${paramCount}`;
            params.push(filters.entity_type);
        }

        if (filters.category) {
            paramCount++;
            query += ` AND category = $${paramCount}`;
            params.push(filters.category);
        }

        if (filters.search) {
            paramCount++;
            query += ` AND name ILIKE $${paramCount}`;
            params.push(`%${filters.search}%`);
        }

        // Sorting
        const sortBy = filters.sortBy || 'mention_count';
        const sortOrder = filters.sortOrder || 'DESC';
        query += ` ORDER BY ${sortBy} ${sortOrder}`;

        // Pagination
        const limit = filters.limit || 50;
        const offset = filters.offset || 0;
        query += ` LIMIT ${limit} OFFSET ${offset}`;

        const result = await db.query(query, params);
        return result.rows;
    }

    /**
     * Get entity by ID
     */
    async getEntityById(userId, entityId) {
        const query = `
            SELECT * FROM entities
            WHERE id = $1 AND user_id = $2
        `;

        const result = await db.query(query, [entityId, userId]);

        if (result.rows.length === 0) {
            throw new Error('Entity not found');
        }

        return result.rows[0];
    }

    /**
     * Search entities by name
     */
    async searchEntities(userId, searchTerm, entityType = null) {
        let query = `
            SELECT * FROM entities
            WHERE user_id = $1
              AND name ILIKE $2
        `;

        const params = [userId, `%${searchTerm}%`];

        if (entityType) {
            query += ` AND entity_type = $3`;
            params.push(entityType);
        }

        query += ` ORDER BY mention_count DESC LIMIT 20`;

        const result = await db.query(query, params);
        return result.rows;
    }

    /**
     * Get entity statistics
     */
    async getEntityStats(userId) {
        const query = `
            SELECT 
                entity_type,
                COUNT(*) as count,
                SUM(mention_count) as total_mentions
            FROM entities
            WHERE user_id = $1
            GROUP BY entity_type
            ORDER BY count DESC
        `;

        const result = await db.query(query, [userId]);
        return result.rows;
    }

    /**
     * Get top entities (most mentioned)
     */
    async getTopEntities(userId, limit = 10, entityType = null) {
        let query = `
            SELECT * FROM entities
            WHERE user_id = $1
        `;

        const params = [userId];

        if (entityType) {
            query += ` AND entity_type = $2`;
            params.push(entityType);
        }

        query += ` ORDER BY mention_count DESC LIMIT ${limit}`;

        const result = await db.query(query, params);
        return result.rows;
    }

    /**
     * Update entity
     */
    async updateEntity(userId, entityId, updates) {
        const allowedFields = ['name', 'category', 'properties'];
        const setClauses = [];
        const params = [entityId, userId];
        let paramCount = 2;

        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                paramCount++;
                setClauses.push(`${field} = $${paramCount}`);
                params.push(field === 'properties' ? JSON.stringify(updates[field]) : updates[field]);
            }
        }

        if (setClauses.length === 0) {
            throw new Error('No valid fields to update');
        }

        const query = `
            UPDATE entities
            SET ${setClauses.join(', ')}
            WHERE id = $1 AND user_id = $2
            RETURNING *
        `;

        const result = await db.query(query, params);

        if (result.rows.length === 0) {
            throw new Error('Entity not found');
        }

        return result.rows[0];
    }

    /**
     * Delete entity
     */
    async deleteEntity(userId, entityId) {
        const query = `
            DELETE FROM entities
            WHERE id = $1 AND user_id = $2
            RETURNING *
        `;

        const result = await db.query(query, [entityId, userId]);

        if (result.rows.length === 0) {
            throw new Error('Entity not found');
        }

        return result.rows[0];
    }

    /**
     * Get entities by type
     */
    async getEntitiesByType(userId, entityType) {
        const query = `
            SELECT * FROM entities
            WHERE user_id = $1 AND entity_type = $2
            ORDER BY mention_count DESC
        `;

        const result = await db.query(query, [userId, entityType]);
        return result.rows;
    }

    /**
     * Get recently seen entities
     */
    async getRecentEntities(userId, days = 7, limit = 20) {
        const query = `
            SELECT * FROM entities
            WHERE user_id = $1
              AND last_seen_at >= NOW() - INTERVAL '${days} days'
            ORDER BY last_seen_at DESC
            LIMIT ${limit}
        `;

        const result = await db.query(query, [userId]);
        return result.rows;
    }
}

export default new EntityService();
