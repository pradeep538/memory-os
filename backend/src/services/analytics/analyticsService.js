
import axios from 'axios';
import config from '../../config/index.js';

class AnalyticsService {
    constructor() {
        // Analytics Service URL (default to 8001 if not in config)
        this.baseUrl = config.analyticsEngineUrl || 'http://localhost:8001';
    }

    /**
     * Get patterns for a user
     * @param {string} userId 
     * @returns {Promise<Object>} Patterns data
     */
    async getPatterns(userId) {
        try {
            const response = await axios.get(`${this.baseUrl}/api/v1/patterns/${userId}`, {
                timeout: 5000 // 5s timeout
            });
            return response.data;
        } catch (error) {
            console.error(`Analytics Service Error (getPatterns): ${error.message}`);
            // Resilient Fallback: Return empty patterns instead of crashing worker
            return {
                patterns: []
            };
        }
    }

    /**
     * Get consistency metrics
     */
    async getConsistency(userId) {
        try {
            const response = await axios.get(`${this.baseUrl}/api/v1/consistency/${userId}`, {
                timeout: 5000
            });
            return response.data;
        } catch (error) {
            console.error(`Analytics Service Error (getConsistency): ${error.message}`);
            // Resilient Fallback: Return null to degrade gracefully
            return null;
        }
    }
}

export default new AnalyticsService();
