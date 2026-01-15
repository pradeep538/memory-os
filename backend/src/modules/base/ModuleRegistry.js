import GenericModule from '../generic/generic.module.js';
import RoutineModule from '../routine/routine.module.js';
import FitnessModule from '../fitness/fitness.module.js';
import FinanceModule from '../finance/finance.module.js';
import HealthModule from '../health/health.module.js';
import MindfulnessModule from '../mindfulness/mindfulness.module.js';
import CategoryModule from './CategoryModule.js';

/**
 * Module Registry
 * 
 * Manages all category modules
 * Routes memories to appropriate modules
 */
class ModuleRegistry {
    constructor() {
        this.modules = new Map();
        this.fallbackModule = new GenericModule();

        // Register default modules
        this.registerDefaults();
    }

    /**
     * Register default modules
     */
    registerDefaults() {
        this.register(new GenericModule());
        this.register(new RoutineModule());
        this.register(new FitnessModule());
        this.register(new FinanceModule());
        this.register(new HealthModule());
        this.register(new MindfulnessModule());

        console.log('📦 Registered modules:', Array.from(this.modules.keys()));
    }

    /**
     * Register a module
     */
    register(module) {
        if (!(module instanceof CategoryModule)) {
            throw new Error('Module must extend CategoryModule');
        }

        this.modules.set(module.category, module);
        console.log(`  ✓ Registered: ${module.name} (${module.category})`);
    }

    /**
     * Get module by category
     */
    get(category) {
        return this.modules.get(category) || this.fallbackModule;
    }

    /**
     * Get all registered modules
     */
    getAll() {
        return Array.from(this.modules.values());
    }

    /**
     * Get module metadata
     */
    getModuleInfo(category) {
        const module = this.get(category);
        return module.getMetadata();
    }

    /**
     * Get all module metadata
     */
    getAllModuleInfo() {
        return this.getAll().map(module => module.getMetadata());
    }

    /**
     * Check if category is supported
     */
    hasModule(category) {
        return this.modules.has(category);
    }

    /**
     * Process memory with appropriate module
     */
    async processMemory(memoryUnit) {
        const module = this.get(memoryUnit.category);

        try {
            const result = await module.processMemory(memoryUnit);
            return {
                ...result,
                module: module.category,
                moduleVersion: module.version
            };
        } catch (error) {
            console.error(`Module processing error (${module.category}):`, error);
            return {
                processed: false,
                error: error.message,
                module: module.category
            };
        }
    }
}

// Singleton instance
const registry = new ModuleRegistry();

export default registry;
