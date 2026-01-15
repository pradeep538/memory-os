/**
 * Base Category Module Interface
 * 
 * All category modules must extend this class and implement required methods.
 * This enables consistent behavior across all categories while allowing
 * category-specific customization.
 */
class CategoryModule {
    constructor(config = {}) {
        this.category = config.category || 'generic';
        this.name = config.name || this.category;
        this.version = config.version || '1.0.0';
    }

    /**
     * Process a memory unit for this category
     * Called after memory is stored in database
     * 
     * @param {Object} memoryUnit - The stored memory unit
     * @param {string} memoryUnit.id - Memory ID
     * @param {string} memoryUnit.user_id - User ID
     * @param {string} memoryUnit.category - Category name
     * @param {Object} memoryUnit.normalized_data - Extracted entities
     * @returns {Promise<Object>} Processing result
     */
    async processMemory(memoryUnit) {
        // Override in child class
        return { processed: false, message: 'No processing implemented' };
    }

    /**
     * Generate category-specific insights
     * 
     * @param {string} userId - User ID
     * @param {Object} timeRange - Optional time range filter
     * @returns {Promise<Array>} Array of insights
     */
    async generateInsights(userId, timeRange = {}) {
        // Override in child class
        return [];
    }

    /**
     * Generate a plan for this category
     * 
     * @param {string} userId - User ID
     * @param {string} planType - Type of plan to generate
     * @param {Object} context - Additional context for plan generation
     * @returns {Promise<Object>} Generated plan
     */
    async generatePlan(userId, planType, context = {}) {
        // Override in child class
        throw new Error(`Plan generation not implemented for ${this.category}`);
    }

    /**
     * Update plan progress based on new memory
     * 
     * @param {string} planId - Plan ID
     * @param {Object} memoryUnit - New memory unit
     * @returns {Promise<Object>} Updated progress
     */
    async updatePlanProgress(planId, memoryUnit) {
        // Override in child class
        return { updated: false };
    }

    /**
     * Start a guided session (if applicable)
     * 
     * @param {string} userId - User ID
     * @param {string} sessionType - Type of session
     * @param {Object} config - Session configuration
     * @returns {Promise<Object>} Session info
     */
    async startSession(userId, sessionType, config = {}) {
        // Override in child class
        throw new Error(`Sessions not supported for ${this.category}`);
    }

    /**
     * Complete a guided session
     * 
     * @param {string} sessionId - Session ID
     * @param {Object} feedback - User feedback/results
     * @returns {Promise<Object>} Completion result with auto-created memory
     */
    async completeSession(sessionId, feedback = {}) {
        // Override in child class
        throw new Error(`Sessions not supported for ${this.category}`);
    }

    /**
     * Validate if this module can handle the given memory
     * 
     * @param {Object} normalizedData - Normalized memory data
     * @returns {boolean} True if this module can handle it
     */
    canHandle(normalizedData) {
        // Override for custom validation
        return true;
    }

    /**
     * Get module metadata
     * 
     * @returns {Object} Module information
     */
    getMetadata() {
        return {
            category: this.category,
            name: this.name,
            version: this.version,
            capabilities: {
                processMemory: true,
                generateInsights: true,
                generatePlans: false,
                guidedSessions: false
            }
        };
    }
}

export default CategoryModule;
