import correlationService from '../../services/correlations/correlationService.js';

/**
 * Correlation Controller
 * Handles HTTP requests for correlation insights
 */
class CorrelationController {
    /**
     * Get user's correlations
     * GET /api/v1/correlations
     */
    async getUserCorrelations(request, reply) {
        try {
            const userId = request.userId || '00000000-0000-0000-0000-000000000000';
            const { status, min_coefficient, lag_days } = request.query;

            const correlations = await correlationService.getUserCorrelations(
                userId,
                {
                    status,
                    min_coefficient: min_coefficient ? parseFloat(min_coefficient) : undefined,
                    lag_days: lag_days ? parseInt(lag_days) : undefined
                }
            );

            return {
                success: true,
                data: correlations,
                count: correlations.length
            };
        } catch (error) {
            reply.code(500);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get single correlation
     * GET /api/v1/correlations/:id
     */
    async getCorrelation(request, reply) {
        try {
            const { id } = request.params;
            const userId = request.userId || '00000000-0000-0000-0000-000000000000';

            const correlation = await correlationService.getCorrelation(id, userId);

            if (!correlation) {
                reply.code(404);
                return {
                    success: false,
                    error: 'Correlation not found'
                };
            }

            return {
                success: true,
                data: correlation
            };
        } catch (error) {
            reply.code(500);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Calculate correlations for user
     * POST /api/v1/correlations/calculate
     */
    async calculateCorrelations(request, reply) {
        try {
            const userId = request.userId || '00000000-0000-0000-0000-000000000000';
            const { max_lag_days = 3, min_samples = 7 } = request.body || {};

            const results = await correlationService.calculateCorrelations(
                userId,
                { maxLagDays: max_lag_days, minSamples: min_samples }
            );

            return {
                success: true,
                data: results,
                message: `Calculated ${results.length} correlations`
            };
        } catch (error) {
            reply.code(500);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Update correlation status
     * PATCH /api/v1/correlations/:id/status
     */
    async updateStatus(request, reply) {
        try {
            const { id } = request.params;
            const { status } = request.body;
            const userId = request.userId || '00000000-0000-0000-0000-000000000000';

            if (!['active', 'pinned', 'dismissed'].includes(status)) {
                reply.code(400);
                return {
                    success: false,
                    error: 'Invalid status. Must be: active, pinned, or dismissed'
                };
            }

            const updated = await correlationService.updateCorrelationStatus(
                id,
                userId,
                status
            );

            if (!updated) {
                reply.code(404);
                return {
                    success: false,
                    error: 'Correlation not found'
                };
            }

            return {
                success: true,
                data: updated,
                message: `Correlation status updated to ${status}`
            };
        } catch (error) {
            reply.code(500);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Submit feedback for correlation
     * POST /api/v1/correlations/:id/feedback
     */
    async submitFeedback(request, reply) {
        try {
            const { id } = request.params;
            const { is_helpful, comment } = request.body;
            const userId = request.userId || '00000000-0000-0000-0000-000000000000';

            if (typeof is_helpful !== 'boolean') {
                reply.code(400);
                return {
                    success: false,
                    error: 'is_helpful field is required (boolean)'
                };
            }

            const feedback = await correlationService.submitFeedback(
                id,
                userId,
                is_helpful,
                comment
            );

            return {
                success: true,
                data: feedback,
                message: 'Feedback submitted successfully'
            };
        } catch (error) {
            reply.code(500);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get correlation statistics
     * GET /api/v1/correlations/stats
     */
    async getStats(request, reply) {
        try {
            const userId = request.userId || '00000000-0000-0000-0000-000000000000';

            const stats = await correlationService.getCorrelationStats(userId);

            return {
                success: true,
                data: stats
            };
        } catch (error) {
            reply.code(500);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get available metrics
     * GET /api/v1/correlations/metrics
     */
    async getMetrics(request, reply) {
        try {
            const { category } = request.query;

            const metrics = await correlationService.getAvailableMetrics(category);

            return {
                success: true,
                data: metrics,
                count: metrics.length
            };
        } catch (error) {
            reply.code(500);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

export default new CorrelationController();
