import MemoryModel from '../../models/memory.model.js';
import UserModel from '../../models/user.model.js';
import moduleRegistry from '../../modules/base/ModuleRegistry.js';

class MemoryService {
    /**
     * Process and store a new memory
     */
    async createMemory(userId, inputData) {
        const { rawInput, source, eventType, category, normalizedData, confidenceScore } = inputData;

        // For now, we'll use simple status logic
        // Later: integrate LLM for understanding
        const status = confidenceScore >= 0.85 ? 'validated' : 'tentative';

        const memory = await MemoryModel.create({
            userId,
            rawInput,
            source,
            eventType,
            category,
            normalizedData,
            confidenceScore,
            status
        });

        // Process with category module
        try {
            const moduleResult = await moduleRegistry.processMemory(memory);
            console.log(`📦 Module processing (${category}):`, moduleResult);

            // Attach module result to memory for reference
            memory.module_processed = moduleResult.processed;
            memory.module_info = moduleResult;
        } catch (error) {
            console.error('❌ Module processing failed:', error);
            // Continue even if module processing fails
        }

        // --- NEW: Update Plan Progress ---
        try {
            // Lazy load to avoid circular dependencies if any
            const { default: planProgress } = await import('../plans/planProgress.js');
            await planProgress.updateProgress(memory);
        } catch (error) {
            console.error('❌ Plan progress update failed:', error);
        }
        // --------------------------------

        return memory;
    }

    /**
     * Get memories for a user
     */
    async getUserMemories(userId, filters = {}) {
        // Check subscription tier for history limits
        const user = await UserModel.findById(userId);

        if (user.subscription_tier === 'free' && !filters.startDate) {
            // Free tier: only last 90 days
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            filters.startDate = ninetyDaysAgo;
        }

        return await MemoryModel.findByUser(userId, filters);
    }

    /**
     * Get single memory
     */
    async getMemory(memoryId, userId) {
        return await MemoryModel.findById(memoryId, userId);
    }

    /**
     * Update memory (create correction)
     */
    async correctMemory(originalId, userId, correctedData) {
        return await MemoryModel.createCorrection(originalId, userId, correctedData);
    }

    /**
     * Get category statistics
     */
    async getCategoryStats(userId) {
        return await MemoryModel.getCountByCategory(userId);
    }
    /**
     * Delete a memory
     */
    async deleteMemory(memoryId, userId) {
        return await MemoryModel.delete(memoryId, userId);
    }
}

export default new MemoryService();
