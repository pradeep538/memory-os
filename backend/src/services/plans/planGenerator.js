import db from '../../db/index.js';

/**
 * Plan Generation Service
 * Creates personalized behavior change plans
 */
class PlanGenerator {
    /**
     * Generate plan for user based on category and goals
     */
    async generatePlan(userId, category, goal, frequency) {
        // Get user's current stats and consistency
        const stats = await this.getUserStats(userId, category);
        const consistency = await this.getConsistencyScore(userId, category);

        // Select appropriate plan template (async now due to LLM potential)
        const template = await this.selectTemplate(category, goal, stats, consistency, frequency);

        // Customize plan
        const plan = this.customizePlan(template, stats, consistency);

        // Save to database
        return await this.savePlan(userId, category, plan);
    }

    /**
     * Select plan template
     */
    async selectTemplate(category, goal, stats, consistency, frequency) {
        // Defined templates (Restored for fallback)
        const templates = {
            fitness: {
                build_consistency: {
                    name: 'Build Workout Consistency',
                    description: 'Progressive plan to establish regular workout routine',
                    duration_weeks: 4,
                    phases: [
                        { week: 1, frequency: 2, duration: 20, intensity: 'low', goal: 'Build the habit of showing up' },
                        { week: 2, frequency: 3, duration: 25, intensity: 'low-medium', goal: 'Increase frequency gradually' },
                        { week: 3, frequency: 3, duration: 30, intensity: 'medium', goal: 'Establish 3x/week routine' },
                        { week: 4, frequency: 4, duration: 30, intensity: 'medium', goal: 'Solidify habit, add variety' }
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
                        { week: 1, target: 0.9, goal: 'Track and awareness' },
                        { week: 2, target: 0.8, goal: 'Reduce by 20%' },
                        { week: 3, target: 0.7, goal: 'Reduce by 30%' },
                        { week: 4, target: 0.65, goal: 'Maintain new baseline' }
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

        // 1. Try exact match (if goal is a template key)
        let selected = templates[category]?.[goal];
        if (selected) return selected;

        // 2. ALWAYS try LLM for Custom Goals
        console.log(`🤖 Generating custom plan with LLM for: ${goal} (${frequency})...`);
        try {
            const customPlan = await this.generateCustomPlan(category, goal, stats, frequency);
            if (customPlan) return customPlan;
        } catch (error) {
            console.error('LLM Generation failed:', error);
            // Fallback continues below
        }

        // 3. Fallback: Use category default but rename
        console.log('⚠️ using fallback template logic');
        if (templates[category]) {
            const firstKey = Object.keys(templates[category])[0];
            selected = templates[category][firstKey];
        } else {
            // Ultimate fallback
            selected = {
                name: goal,
                description: 'Custom plan',
                duration_weeks: 4,
                phases: []
            };
        }

        return {
            ...selected,
            name: goal,
            description: `(Fallback) Custom ${category} plan: ${goal}`,
            original_template: selected.name || 'fallback'
        };
    }

    /**
     * Call LLM to generate custom plan JSON
     */
    async generateCustomPlan(category, goal, stats, frequency) {
        const prompt = `
        You are an expert behavior change coach. Create a 4-week Action Plan for a user.
        
        DOMAIN: ${category}
        GOAL: "${goal}"
        PREFERRED FREQUENCY: "${frequency || 'As needed'}"
        USER STATS: ${JSON.stringify(stats)}
        
        CRITICAL INSTRUCTIONS:
        1. Context Awareness: Check the USER STATS.
           - If stats are empty or zero (total_events: 0), the user is new or has no data.
           - In this case, Phase 1 (Week 1) MUST be an "Audit & Baseline" phase (e.g., "Track expenses", "Test max pushups").
           - Do NOT assume they can hit the goal immediately if you have no baseline.
        2. Feasibility:
           - If the goal seems ambitious for a beginner (based on stats), scale the first 2 weeks to be preparatory.
        3. Alignment:
           - Ensure the weekly targets respect the PREFERRED FREQUENCY (${frequency}).
           - If frequency is "Daily", targets should be ~7x/week. If "3x/week", match that.
        
        Respond ONLY with valid JSON in this structure:
        {
          "description": "Brief 1-sentence overview",
          "start_level": "beginner" | "intermediate" | "advanced",
          "note": "Motivational starting tip (mention if you adjusted for missing data)",
          "duration_weeks": 4,
          "phases": [
            {
              "week": 1,
              "goal": "Specific focus for this week (max 5 words)",
              "target": "Quantifiable target (e.g. '3x/week', '$50/day', '10 mins')"
            }
          ]
        }
        `;

        // Lazy import
        const { default: llmService } = await import('../understanding/llmService.js');

        const responseText = await llmService.generateStructuredResponse(prompt);

        // Clean JSON
        let jsonStr = responseText.trim();
        if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7, -3).trim();
        else if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3, -3).trim();

        try {
            return JSON.parse(jsonStr);
        } catch (e) {
            console.error('Failed to parse LLM plan JSON:', e);
            return null;
        }
    }

    /**
     * Customize plan based on user stats
     */
    customizePlan(template, stats, consistency) {
        const plan = { ...template };

        // Adjust based on consistency score
        if (consistency < 30) {
            plan.start_level = 'beginner';
            plan.note = plan.note || 'Starting slow to build sustainable habits';
        } else if (consistency < 60) {
            plan.start_level = 'intermediate';
            plan.note = plan.note || 'You have some consistency, building on that';
        } else {
            plan.start_level = 'advanced';
            plan.note = plan.note || 'Great consistency! Optimizing for results';
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
        try {
            const query = `
                INSERT INTO plans(
                    user_id, category, plan_name, plan_data,
                    duration_weeks, status
                )
                VALUES($1, $2, $3, $4, $5, 'active')
                RETURNING *
            `;

            const result = await db.query(query, [
                userId,
                category,
                plan.name || 'New Plan',
                plan,
                plan.duration_weeks || 4
            ]);

            return result.rows[0];
        } catch (error) {
            console.error('Save Plan Error:', error);
            throw error;
        }
    }

    // --- Helpers ---

    async getUserStats(userId, category) {
        // Placeholder for real stats logic
        return { total_events: 0 };
    }

    async getConsistencyScore(userId, category) {
        // Placeholder
        return 50;
    }
}

export default new PlanGenerator();
