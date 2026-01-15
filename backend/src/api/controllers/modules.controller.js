import moduleRegistry from '../../modules/base/ModuleRegistry.js';

class ModulesController {
    /**
     * Get all registered modules
     * GET /api/v1/modules
     */
    async listModules(request, reply) {
        try {
            const modules = moduleRegistry.getAllModuleInfo();

            reply.send({
                success: true,
                data: modules,
                count: modules.length
            });
        } catch (error) {
            request.log.error(error);
            reply.code(500).send({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get specific module info
     * GET /api/v1/modules/:category
     */
    async getModule(request, reply) {
        try {
            const { category } = request.params;
            const moduleInfo = moduleRegistry.getModuleInfo(category);

            reply.send({
                success: true,
                data: moduleInfo
            });
        } catch (error) {
            request.log.error(error);
            reply.code(500).send({
                success: false,
                error: error.message
            });
        }
    }
}

export default new ModulesController();
