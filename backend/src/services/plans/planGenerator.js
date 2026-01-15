import db from '../../db/index.js';

/**
 * Plan Generation Service
 * Creates personalized behavior change plans
 */
class PlanGenerator {
    /**
     * Generate plan for user based on category and goals
     */
    async generatePlan(userId, category, goal) {
        // Get user's current stats and consistency
        const stats = await this.getUserStats(userId, category);
        const consistency = await this.getConsistencyScore(userId, category);

        // Select appropriate plan template
        const template = this.selectTemplate(category, goal, stats, consistency);

        // Customize plan
        const plan = this.customizePlan(template, stats, consistency);

        // Save to database
        return await this.savePlan(userId, category, plan);
    }

    /**
     * Select plan template
     */
    selectTemplate(category, goal, stats, consistency) {
        const templates = {
            fitness: {
                build_consistency: {
                    name: 'Build Workout Consistency',
                    description: 'Progressive plan to establish regular workout routine',
                    duration_weeks: 4,
                    phases: [
                        {
                            week: 1,
                            frequency: 2,
                            duration: 20,
                            intensity: 'low',
                            goal: 'Build the habit of showing up'
                        },
                        {
                            week: 2,
                            frequency: 3,
                            duration: 25,
                            intensity: 'low-medium',
                            goal: 'Increase frequency gradually'
                        },
                        {
                            week: 3,
                            frequency: 3,
                            duration: 30,
                            intensity: 'medium',
                            goal: 'Establish 3x/week routine'
                        },
                        {
                            week: 4,
                            frequency: 4,
                            duration: 30,
                            intensity: 'medium',
                            goal: 'Solidify habit, add variety'
                        }
                    ]
                }
            },
            finance: {
                reduce_spending: {
                    name: 'Reduce Discretionary Spending',
                    description: 'Gradual reduction plan for sustainable savings',
                    duration_weeks: 4,
                    baseline: stats.avg_weekly_spending || 5000,
                    phases: [
                        {
                            week: 1,
                            target: 0.9, // 90% of baseline
                            goal: 'Track and awareness'
                        },
                        {
                            week: 2,
                            target: 0.8, // 80% of baseline
                            goal: 'Reduce by 20%'
                        },
                        {
                            week: 3,
                            target: 0.7, // 70% of baseline
                            goal: 'Reduce by 30%'
                        },
                        {
                            week: 4,
                            target: 0.65, // 65% of baseline
                            goal: 'Maintain new baseline'
                        }
                    ]
                }
            },
            routine: {
                habit_stack: {
                    name: 'Morning Routine Stack',
                    description: 'Build compound habits using habit stacking',
                    duration_weeks: 3,
                    habits: [
                        { name: 'Wake up at consistent time', week: 1 },
                        { name: 'Drink water immediately', week: 1 },
                        { name: 'Light stretching', week: 2 },
                        { name: 'Plan your day', week: 3 }
                    ]
                }
            }
        };

        return templates[category]?.[goal] || templates.fitness.build_consistency;
    }

    /**
     * Customize plan based on user stats
     */
    customizePlan(template, stats, consistency) {
        const plan = { ...template };

        // Adjust based on consistency score
        if (consistency < 30) {
            plan.start_level = 'beginner';
            plan.note = 'Starting slow to build sustainable habits';
        } else if (consistency < 60) {
            plan.start_level = 'intermediate';
            plan.note = 'You have some consistency, building on that';
        } else {
            plan.start_level = 'advanced';
            plan.note = 'Great consistency! Optimizing for results';
        }

        // Add current stats for comparison
        plan.baseline_stats = stats;
        plan.consistency_score = consistency;

        return plan;
    }

    /**
     * Save plan to database
     */
    async savePlan(userId, category, plan) {
        const query = `
      INSERT INTO plans (
        user_id, category, plan_name, plan_data,
        duration_weeks, status
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

        const values = [
            userId,
            category,
            plan.name,
            JSON.stringify(plan),
            plan.duration_weeks,
            'active'
        ];

        try {
            const result = await db.query(query, values);
            return result.rows[0];
        } catch (error) {
            // Table might not exist yet
            console.log('Plans table not created yet, returning plan data');
            return { ...plan, user_id: userId, category };
        }
    }

    /**
     * Get user stats
     */
    async getUserStats(userId, category) {
        const query = `
      SELECT 
        COUNT(*) as total_events,
        COUNT(DISTINCT metric_date) as active_days,
        AVG(numeric_value) as avg_value,
        SUM(numeric_value) as total_value
      FROM metrics
      WHERE user_id = $1 
        AND category = $2
        AND metric_date >= NOW() - INTERVAL '30 days'
    `;

        try {
            const result = await db.query(query, [userId, category]);
            return result.rows[0] || { total_events: 0, active_days: 0 };
        } catch (error) {
            return { total_events: 0, active_days: 0 };
        }
    }

    /**
     * Get consistency score
     */
    async getConsistencyScore(userId, category) {
        // Call analytics service
        try {
            const response = await fetch(
                `http://localhost:8001/api/v1/consistency/${userId}/category/${category}`
            );
            const data = await response.json();
            return data.data?.consistency_score || 0;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Get plan templates
     */
    getAvailableTemplates(category) {
        const allTemplates = {
            fitness: ['build_consistency', 'increase_intensity', 'workout_variety'],
            finance: ['reduce_spending', 'increase_savings', 'debt_payoff'],
            routine: ['habit_stack', 'morning_routine', 'evening_routine']
        };

        return allTemplates[category] || [];
    }
}

export default new PlanGenerator();
