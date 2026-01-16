import { query as db } from '../../db/index.js';

export class RoutinesController {
    /**
     * Create new routine schedule
     * POST /api/v1/routines
     */
    async create(request, reply) {
        try {
            const {
                routineName,
                routineType,
                description,
                scheduleTimes,
                scheduleDays,
                frequency,
                notificationTitle,
                notificationBody
            } = request.body;

            const userId = request.userId;

            if (!routineName || !routineType || !scheduleTimes || !scheduleDays) {
                return reply.code(400).send({
                    success: false,
                    error: 'Missing required fields: routineName, routineType, scheduleTimes, scheduleDays'
                });
            }

            const result = await db.query(`
        INSERT INTO routine_schedules (
          user_id, routine_name, routine_type, description,
          schedule_times, schedule_days, frequency,
          notification_title, notification_body
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING *
      `, [
                userId,
                routineName,
                routineType,
                description,
                scheduleTimes,
                scheduleDays,
                frequency || 'custom',
                notificationTitle || `Time for ${routineName}`,
                notificationBody || `Reminder: ${routineName}`
            ]);

            reply.send({
                success: true,
                routine: result[0]
            });

        } catch (error) {
            request.log.error('Create routine error:', error);
            reply.code(500).send({
                success: false,
                error: 'Failed to create routine',
                message: error.message
            });
        }
    }

    /**
     * Get all user routines
     * GET /api/v1/routines
     */
    async list(request, reply) {
        try {
            const userId = request.userId;

            const routines = await db.query(`
        SELECT *
        FROM routine_schedules
        WHERE user_id = ?
        ORDER BY routine_name
      `, [userId]);

            reply.send({
                success: true,
                routines
            });

        } catch (error) {
            request.log.error('List routines error:', error);
            reply.code(500).send({
                success: false,
                error: 'Failed to fetch routines',
                message: error.message
            });
        }
    }

    /**
     * Get single routine
     * GET /api/v1/routines/:id
     */
    async getOne(request, reply) {
        try {
            const { id } = request.params;
            const userId = request.userId;

            const routines = await db.query(`
        SELECT *
        FROM routine_schedules
        WHERE id = ? AND user_id = ?
      `, [id, userId]);

            if (routines.length === 0) {
                return reply.code(404).send({
                    success: false,
                    error: 'Routine not found'
                });
            }

            reply.send({
                success: true,
                routine: routines[0]
            });

        } catch (error) {
            request.log.error('Get routine error:', error);
            reply.code(500).send({
                success: false,
                error: 'Failed to fetch routine',
                message: error.message
            });
        }
    }

    /**
     * Update routine
     * PUT /api/v1/routines/:id
     */
    async update(request, reply) {
        try {
            const { id } = request.params;
            const userId = request.userId;
            const updates = request.body;

            // Build dynamic UPDATE query
            const fields = [];
            const values = [];

            const allowedFields = [
                'routine_name', 'routine_type', 'description',
                'schedule_times', 'schedule_days', 'frequency',
                'notification_enabled', 'notification_title', 'notification_body'
            ];

            for (const [key, value] of Object.entries(updates)) {
                if (allowedFields.includes(key)) {
                    fields.push(`${key} = ?`);
                    values.push(value);
                }
            }

            if (fields.length === 0) {
                return reply.code(400).send({
                    success: false,
                    error: 'No valid fields to update'
                });
            }

            fields.push('updated_at = NOW()');
            values.push(id, userId);

            const result = await db.query(`
        UPDATE routine_schedules
        SET ${fields.join(', ')}
        WHERE id = ? AND user_id = ?
        RETURNING *
      `, values);

            if (result.length === 0) {
                return reply.code(404).send({
                    success: false,
                    error: 'Routine not found'
                });
            }

            reply.send({
                success: true,
                routine: result[0]
            });

        } catch (error) {
            request.log.error('Update routine error:', error);
            reply.code(500).send({
                success: false,
                error: 'Failed to update routine',
                message: error.message
            });
        }
    }

    /**
     * Delete routine
     * DELETE /api/v1/routines/:id
     */
    async delete(request, reply) {
        try {
            const { id } = request.params;
            const userId = request.userId;

            const result = await db.query(`
        DELETE FROM routine_schedules
        WHERE id = ? AND user_id = ?
        RETURNING id
      `, [id, userId]);

            if (result.length === 0) {
                return reply.code(404).send({
                    success: false,
                    error: 'Routine not found'
                });
            }

            reply.send({
                success: true,
                message: 'Routine deleted successfully'
            });

        } catch (error) {
            request.log.error('Delete routine error:', error);
            reply.code(500).send({
                success: false,
                error: 'Failed to delete routine',
                message: error.message
            });
        }
    }

    /**
     * Toggle notification
     * PATCH /api/v1/routines/:id/toggle
     */
    async toggleNotification(request, reply) {
        try {
            const { id } = request.params;
            const userId = request.userId;

            const result = await db.query(`
        UPDATE routine_schedules
        SET notification_enabled = NOT notification_enabled,
            updated_at = NOW()
        WHERE id = ? AND user_id = ?
        RETURNING *
      `, [id, userId]);

            if (result.length === 0) {
                return reply.code(404).send({
                    success: false,
                    error: 'Routine not found'
                });
            }

            reply.send({
                success: true,
                routine: result[0]
            });

        } catch (error) {
            request.log.error('Toggle notification error:', error);
            reply.code(500).send({
                success: false,
                error: 'Failed to toggle notification',
                message: error.message
            });
        }
    }
}

export default new RoutinesController();
