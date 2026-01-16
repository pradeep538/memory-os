import habitService from '../../services/habits/habitService.js';
import auth from '../../middleware/auth.js';

export default async function habitRoutes(fastify, options) {
    /**
     * Create a new habit
     */
    fastify.post('/habits', { preHandler: auth.authenticate }, async (request, reply) => {
        try {
            const userId = request.userId;
            const habit = await habitService.createHabit(userId, request.body);

            return {
                success: true,
                data: habit
            };
        } catch (error) {
            reply.code(400);
            return {
                success: false,
                error: error.message
            };
        }
    });

    /**
     * Get user's habits
     */
    fastify.get('/habits', { preHandler: auth.authenticate }, async (request, reply) => {
        try {
            const userId = request.userId;
            const { status = 'active' } = request.query;

            console.log(`[GET /habits] User: ${userId}, Status: ${status}`);
            const habits = await habitService.getUserHabits(userId, status);
            console.log(`[GET /habits] Found: ${habits.length}`);

            return {
                success: true,
                data: habits,
                count: habits.length
            };
        } catch (error) {
            reply.code(500);
            return {
                success: false,
                error: error.message
            };
        }
    });

    /**
     * Get habit progress
     */
    fastify.get('/habits/:habitId/progress', { preHandler: auth.authenticate }, async (request, reply) => {
        try {
            const { habitId } = request.params;
            const progress = await habitService.getHabitProgress(habitId);

            return {
                success: true,
                data: progress
            };
        } catch (error) {
            reply.code(404);
            return {
                success: false,
                error: error.message
            };
        }
    });

    /**
     * Update habit
     */
    fastify.patch('/habits/:habitId', { preHandler: auth.authenticate }, async (request, reply) => {
        try {
            const { habitId } = request.params;
            const habit = await habitService.updateHabit(habitId, request.body);

            return {
                success: true,
                data: habit
            };
        } catch (error) {
            reply.code(400);
            return {
                success: false,
                error: error.message
            };
        }
    });

    /**
     * Delete habit
     */
    fastify.delete('/habits/:habitId', { preHandler: auth.authenticate }, async (request, reply) => {
        try {
            const { habitId } = request.params;
            await habitService.deleteHabit(habitId);

            return {
                success: true,
                message: 'Habit deleted successfully'
            };
        } catch (error) {
            reply.code(404);
            return {
                success: false,
                error: error.message
            };
        }
    });

    /**
     * Log habit completion
     */
    fastify.post('/habits/:habitId/complete', { preHandler: auth.authenticate }, async (request, reply) => {
        try {
            const userId = request.userId;
            const { habitId } = request.params;
            const { completed = true, notes } = request.body;

            const completion = await habitService.logCompletion(habitId, userId, completed, notes);

            return {
                success: true,
                data: completion,
                message: completed ? 'Great job! Keep it up! 🎉' : 'No worries, try again tomorrow!'
            };
        } catch (error) {
            reply.code(400);
            return {
                success: false,
                error: error.message
            };
        }
    });

    /**
     * Get habit suggestions
     */
    fastify.get('/habits/suggestions', { preHandler: auth.authenticate }, async (request, reply) => {
        try {
            const userId = request.userId;
            const suggestions = await habitService.suggestHabits(userId);

            return {
                success: true,
                data: suggestions
            };
        } catch (error) {
            reply.code(500);
            return {
                success: false,
                error: error.message
            };
        }
    });
}
