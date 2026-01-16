import { query } from '../db/index.js';

class FeatureFlagModel {
    /**
     * Get all active feature flags
     * @returns {Promise<Array>} List of feature flags
     */
    static async getAll() {
        // Return all flags that are enabled
        // Or actually return ALL so frontend can know explicitly if disabled
        const text = `
            SELECT feature_key, is_enabled, visibility_type, param_duration_days 
            FROM feature_flags 
        `;
        const result = await query(text);
        return result.rows;
    }

    /**
     * Get a specific flag by key
     */
    static async findByKey(key) {
        const text = `
            SELECT * FROM feature_flags WHERE feature_key = $1
        `;
        const result = await query(text, [key]);
        return result.rows[0];
    }
}

export default FeatureFlagModel;
