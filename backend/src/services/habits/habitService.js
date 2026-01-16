import HabitModel from '../../models/habit.model.js';

/**
 * Habit Service - Business logic for habits
 */
class HabitService {
    /**
     * Create a new habit
     */
    async createHabit(userId, habitData) {
        // Normalize keys (support snake_case from API)
        const normalizedData = {
            habitName: habitData.habitName || habitData.habit_name,
            habitType: habitData.habitType || habitData.habit_type,
            category: habitData.category,
            description: habitData.description,
            targetFrequency: habitData.targetFrequency || habitData.target_frequency,
            targetFrequencyUnit: (habitData.targetFrequencyUnit || habitData.target_frequency_unit || 'weekly')
                .replace(/^day$/, 'daily')
                .replace(/^week$/, 'weekly')
                .replace(/^month$/, 'monthly'),
            baselineFrequency: habitData.baselineFrequency || habitData.baseline_frequency,
            targetMaxFrequency: habitData.targetMaxFrequency || habitData.target_max_frequency,
            reminderEnabled: habitData.reminderEnabled ?? habitData.reminder_enabled ?? true,
            reminderTime: habitData.reminderTime || habitData.reminder_time,
            reminderDays: habitData.reminderDays || habitData.reminder_days,
            targetCompletionDate: habitData.targetCompletionDate || habitData.target_completion_date
        };

        // Validate habit data
        this.validateHabitData(normalizedData);

        return await HabitModel.create(userId, normalizedData);
    }

    /**
     * Check if input text indicates completion of an existing habit
     */
    async checkCompletionIntent(userId, text) {
        try {
            // 1. Get active habits
            const habits = await this.getUserHabits(userId, 'active');
            if (habits.length === 0) return null;

            const habitNames = habits.map(h => h.habit_name);

            // 2. Simple fuzzy match first (optimization)
            const lowerText = text.toLowerCase();
            const directMatch = habits.find(h => lowerText.includes(h.habit_name.toLowerCase()));
            if (directMatch) return directMatch;

            // 3. LLM Match for complex cases
            const llmService = (await import('../understanding/llmService.js')).default;

            const prompt = `
User Input: "${text}"
Active Habits: ${JSON.stringify(habitNames)}

Does the user input likely indicate they completed one of the active habits?
Return ONLY the exact habit name from the list, or "null" if no match.
`;

            const response = await llmService.generateStructuredResponse(prompt);
            const matchedName = response.trim().replace(/"/g, '');

            if (matchedName && matchedName !== 'null' && habitNames.includes(matchedName)) {
                return habits.find(h => h.habit_name === matchedName);
            }

            return null;
        } catch (error) {
            console.error('Check completion intent error:', error);
            return null;
        }
    }

    /**
     * Check if input text indicates intent to CREATE a new habit
     * Returns habit data if detected, or null
     */
    async checkCreationIntent(userId, text) {
        try {
            const llmService = (await import('../understanding/llmService.js')).default;

            const prompt = `
User Input: "${text}"

Does this input indicate a desire to START, CREATE, or STOP a habit?
(e.g., "I want to start running", "I need to quit smoking", "Add a habit to drink water")

If YES, extract details and return JSON:
{
  "detected": true,
  "habit_name": "Short, clear name (e.g., Running, No Sugar)",
  "habit_type": "build" (for good habits) or "quit" (for bad habits),
  "frequency": 1,
  "unit": "day" (default) or "week"
}

If NO (or if it's just a log/memory), return:
{"detected": false}

Respond ONLY with valid JSON.
`;

            const response = await llmService.generateStructuredResponse(prompt);
            const parsed = JSON.parse(response.replace(/```json|```/g, '').trim());

            if (parsed.detected && parsed.habit_name) {
                return {
                    habitName: parsed.habit_name,
                    habitType: parsed.habit_type || 'build',
                    category: 'routine', // Default, logic could be improved to infer category
                    targetFrequency: parsed.frequency || 1,
                    targetFrequencyUnit: parsed.unit || 'day'
                };
            }

            return null;
        } catch (error) {
            console.error('Check creation intent error:', error);
            return null;
        }
    }

    /**
     * Get user's habits
     */
    async getUserHabits(userId, status = 'active') {
        return await HabitModel.findByUser(userId, status);
    }

    /**
     * Get single habit with progress
     */
    async getHabitProgress(habitId) {
        return await HabitModel.getProgress(habitId);
    }

    /**
     * Update habit
     */
    async updateHabit(habitId, updates) {
        const habit = await HabitModel.update(habitId, updates);

        // If frequency changed, recalculate streak
        if (updates.target_frequency || updates.target_frequency_unit) {
            await HabitModel.updateStreak(habitId);
            // Re-fetch to get updated streak in response
            return await HabitModel.findById(habitId);
        }

        return habit;
    }

    /**
     * Delete habit
     */
    async deleteHabit(habitId) {
        return await HabitModel.delete(habitId);
    }

    /**
     * Log today's completion
     */
    async logCompletion(habitId, userId, completed, notes = null) {
        return await HabitModel.logCompletion(habitId, userId, completed, notes);
    }

    /**
     * Get suggested habits from AI pattern analysis
     */
    async suggestHabits(userId) {
        // 1. Analyze user's memory patterns
        const patterns = await this.analyzeUserPatterns(userId);

        // 2. Check for existing habits to avoid duplicates
        const existingHabits = await this.getUserHabits(userId, 'active');
        const existingHabitNames = existingHabits.map(h => h.habit_name.toLowerCase());

        // 3. Generate AI suggestions based on patterns
        const aiSuggestions = await this.generateAISuggestions(userId, patterns, existingHabitNames);

        // 4. Fallback to templates if AI fails or no patterns found
        if (!aiSuggestions || aiSuggestions.length === 0) {
            return this.getHabitTemplates();
        }

        return aiSuggestions;
    }

    /**
     * Analyze user patterns from memory data
     */
    async analyzeUserPatterns(userId) {
        const db = (await import('../../db/index.js')).default;

        // Get memory data from last 60 days
        const query = `
            SELECT 
                category,
                normalized_data->>'activity' as activity,
                COUNT(*) as count
            FROM memory_units
            WHERE user_id = $1
              AND created_at >= NOW() - INTERVAL '60 days'
              AND status = 'validated'
              AND normalized_data->>'activity' IS NOT NULL
            GROUP BY category, normalized_data->>'activity'
            HAVING COUNT(*) >= 3
            ORDER BY count DESC
            LIMIT 20
        `;

        try {
            const result = await db.query(query, [userId]);
            const patterns = result.rows;

            // Categorize patterns
            const categorizedPatterns = {
                recurring: patterns.filter(p => parseInt(p.count) >= 5),
                occasional: patterns.filter(p => parseInt(p.count) >= 3 && parseInt(p.count) < 5),
                categories: this.getCategoryDistribution(patterns),
                allPatterns: patterns
            };

            return categorizedPatterns;
        } catch (error) {
            console.error('Pattern analysis error:', error);
            return { recurring: [], occasional: [], categories: {} };
        }
    }

    /**
     * Get category distribution from patterns
     */
    getCategoryDistribution(patterns) {
        const distribution = {};
        patterns.forEach(p => {
            distribution[p.category] = (distribution[p.category] || 0) + parseInt(p.count);
        });
        return distribution;
    }

    /**
     * Generate AI-powered habit suggestions using LLM
     */
    async generateAISuggestions(userId, patterns, existingHabitNames) {
        const llmService = (await import('../understanding/llmService.js')).default;

        // Build context from patterns
        const context = {
            recurringActivities: patterns.recurring.map(p => ({
                activity: p.activity || 'activity',
                category: p.category,
                count: p.count
            })),
            categories: patterns.categories,
            existingHabits: existingHabitNames
        };

        const prompt = `
You are a personal habit coach. Analyze the user's behavior patterns and suggest 3 personalized habits they should build or quit.

User's Activity Patterns (last 60 days):
${JSON.stringify(context.recurringActivities, null, 2)}

Category Distribution:
${JSON.stringify(context.categories, null, 2)}

Existing Habits (avoid duplicating these):
${existingHabitNames.join(', ') || 'None'}

Based on their patterns, suggest 3 habits:
- 2 habits to BUILD (strengthen positive patterns or fill gaps)
- 1 habit to QUIT (reduce negative patterns)

For each habit, provide:
1. habit_name: Clear, specific name (e.g., "Morning Workout")
2. habit_type: "build" or "quit"
3. category: fitness, finance, routine, mindfulness, or health
4. reason: Why this habit matters for them (based on their patterns)
5. target_frequency: Number (how often per week)
6. target_frequency_unit: "weekly"
7. difficulty: "easy", "medium", or "hard"

Return ONLY a JSON array of 3 habit objects. No extra text.

Example format:
[
  {
    "habit_name": "Morning Meditation",
    "habit_type": "build",
    "category": "mindfulness",
    "reason": "You're logging workouts regularly but no mindfulness practices - meditation would help with recovery",
    "target_frequency": 5,
    "target_frequency_unit": "weekly",
    "difficulty": "easy"
  },
  ...
]
`;

        try {
            const result = await llmService.ai.models.generateContent({
                model: 'gemini-2.0-flash-exp',
                contents: prompt
            });

            const text = result.text.trim();

            // Extract JSON from response
            let jsonText = text;
            if (jsonText.startsWith('```json')) {
                jsonText = jsonText.slice(7, -3).trim();
            } else if (jsonText.startsWith('```')) {
                jsonText = jsonText.slice(3, -3).trim();
            }

            const suggestions = JSON.parse(jsonText);

            // Validate suggestions
            if (!Array.isArray(suggestions) || suggestions.length === 0) {
                console.warn('Invalid AI suggestions format');
                return null;
            }

            return {
                build: suggestions.filter(s => s.habit_type === 'build'),
                quit: suggestions.filter(s => s.habit_type === 'quit'),
                source: 'ai_generated',
                generated_at: new Date().toISOString()
            };

        } catch (error) {
            console.error('AI suggestion generation failed:', error);
            return null;
        }
    }

    /**
     * Validate habit data
     */
    validateHabitData(data) {
        if (!data.habitName) {
            throw new Error('Habit name is required');
        }

        if (!data.habitType || !['build', 'quit'].includes(data.habitType)) {
            throw new Error('Habit type must be "build" or "quit"');
        }

        if (!data.targetFrequency || data.targetFrequency < 0) {
            throw new Error('Target frequency must be a positive number');
        }

        if (data.targetFrequencyUnit &&
            !['daily', 'weekly', 'monthly'].includes(data.targetFrequencyUnit)) {
            throw new Error('Target frequency unit must be daily, weekly, or monthly');
        }
    }

    /**
     * Get habit templates
     */
    getHabitTemplates() {
        return {
            build: [
                {
                    name: 'Morning Workout',
                    category: 'fitness',
                    targetFrequency: 3,
                    targetFrequencyUnit: 'weekly',
                    reminderTime: '07:00',
                    reminderDays: ['mon', 'wed', 'fri']
                },
                {
                    name: 'Daily Reading',
                    category: 'routine',
                    targetFrequency: 7,
                    targetFrequencyUnit: 'weekly',
                    reminderTime: '21:00',
                    reminderDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
                },
                {
                    name: 'Meditation',
                    category: 'mindfulness',
                    targetFrequency: 5,
                    targetFrequencyUnit: 'weekly',
                    reminderTime: '08:00',
                    reminderDays: ['mon', 'tue', 'wed', 'thu', 'fri']
                }
            ],
            quit: [
                {
                    name: 'Reduce Food Delivery',
                    category: 'finance',
                    baselineFrequency: 15,
                    targetMaxFrequency: 8,
                    targetFrequencyUnit: 'monthly'
                },
                {
                    name: 'Stop Snacking After Dinner',
                    category: 'health',
                    targetFrequency: 0,
                    targetFrequencyUnit: 'daily'
                }
            ]
        };
    }
}

export default new HabitService();
