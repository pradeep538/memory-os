import FeatureFlagModel from '../../models/featureFlag.model.js';

class ConfigController {
    /**
     * Get feature flags
     * @route GET /api/v1/config/features
     */
    async getFeatureFlags(request, reply) {
        try {
            const flags = await FeatureFlagModel.getAll();

            // Format response as map for easy frontend lookup? 
            // Or return array of objects. Array is better for metadata.

            return reply.send({
                success: true,
                data: flags,
                count: flags.length
            });
        } catch (error) {
            request.log.error(error);
            return reply.code(500).send({
                success: false,
                error: 'Failed to fetch feature flags'
            });
        }
    }
}

export default new ConfigController();
