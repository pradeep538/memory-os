import scenarioDetector from '../../services/scenarios/scenarioDetector.js';
import db from '../../db/index.js';
import auth from '../../middleware/auth.js';

export default async function scenarioRoutes(fastify, options) {
    /**
     * Detect scenarios for a user
     */
    fastify.post('/scenarios/detect', { preHandler: auth.authenticate }, async (request, reply) => {
        try {
            const userId = request.userId;

            const scenarios = await scenarioDetector.detectScenarios(userId);

            return {
                success: true,
                data: scenarios,
                count: scenarios.length,
                message: `Detected ${scenarios.length} scenarios`
            };
        } catch (error) {
            reply.code(500);
            return { success: false, error: error.message };
        }
    });

    /**
     * Get pending scenarios (for admin panel)
     */
    fastify.get('/scenarios/pending', { preHandler: auth.authenticate }, async (request, reply) => {
        try {
            const query = `
        SELECT * FROM nudge_campaigns
        WHERE status = 'scheduled'
        ORDER BY scheduled_for ASC
        LIMIT 50
      `;

            const result = await db.query(query);

            return {
                success: true,
                data: result.rows,
                count: result.rows.length
            };
        } catch (error) {
            reply.code(500);
            return { success: false, error: error.message };
        }
    });

    /**
     * Manually approve scenario (for admin panel)
     */
    fastify.post('/scenarios/:id/approve', { preHandler: auth.authenticate }, async (request, reply) => {
        try {
            const { id } = request.params;

            const query = `
        UPDATE nudge_campaigns
        SET status = 'approved'
        WHERE id = $1
        RETURNING *
      `;

            const result = await db.query(query, [id]);

            return {
                success: true,
                data: result.rows[0],
                message: 'Scenario approved for sending'
            };
        } catch (error) {
            reply.code(500);
            return { success: false, error: error.message };
        }
    });
}
