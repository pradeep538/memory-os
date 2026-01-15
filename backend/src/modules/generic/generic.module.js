import CategoryModule from '../base/CategoryModule.js';

/**
 * Generic Fallback Module
 * 
 * Handles all memories that don't belong to a specific category
 * Provides basic functionality without specialized features
 */
class GenericModule extends CategoryModule {
    constructor() {
        super({
            category: 'generic',
            name: 'Generic',
            version: '1.0.0'
        });
    }

    /**
     * Process generic memory
     * Just stores it, no special processing
     */
    async processMemory(memoryUnit) {
        return {
            processed: true,
            message: 'Stored as generic memory'
        };
    }

    /**
     * No specific insights for generic category
     */
    async generateInsights(userId, timeRange = {}) {
        return [];
    }

    /**
     * Always returns true - this is the fallback
     */
    canHandle(normalizedData) {
        return true;
    }

    getMetadata() {
        return {
            ...super.getMetadata(),
            capabilities: {
                processMemory: true,
                generateInsights: false,
                generatePlans: false,
                guidedSessions: false
            },
            description: 'Fallback module for uncat egorized memories'
        };
    }
}

export default GenericModule;
