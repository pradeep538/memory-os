import habitService from '../../services/habits/habitService.js';

export default async function habitRoutes(fastify, options) {
    /**
     * Create a new habit
     */
    fastify.post('/habits', async (request, reply) => {
        try {
            const userId = '00000000-0000-0000-0000-000000000000'; // TODO: Get from auth
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
    fastify.get('/habits', async (request, reply) => {
        try {
            const userId = '00000000-0000-0000-0000-000000000000'; // TODO: Get from auth
            const { status = 'active' } = request.query;

            const habits = await habitService.getUserHabits(userId, status);

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
    fastify.get('/habits/:habitId/progress', async (request, reply) => {
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
    fastify.patch('/habits/:habitId', async (request, reply) => {
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
    fastify.delete('/habits/:habitId', async (request, reply) => {
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
    fastify.post('/habits/:habitId/complete', async (request, reply) => {
        try {
            const userId = '00000000-0000-0000-0000-000000000000'; // TODO: Get from auth
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
    fastify.get('/habits/suggestions', async (request, reply) => {
        try {
            const userId = '00000000-0000-0000-0000-000000000000'; // TODO: Get from auth
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
