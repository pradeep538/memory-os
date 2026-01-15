import db from '../../db/index.js';
import llmService from '../understanding/llmService.js';

/**
 * Scenario Detection Service
 * Analyzes user behavior and creates notification scenarios
 */
class ScenarioDetector {
    /**
     * Detect all scenarios for a user
     */
    async detectScenarios(userId) {
        const scenarios = [];

        // Get user engagement data
        const engagement = await this.getEngagement(userId);
        const habits = await this.getActiveHabits(userId);

        // Detect drop-off scenarios
        if (engagement.days_since_last_log >= 1) {
            scenarios.push(await this.createDropOffScenario(userId, engagement));
        }

        // Detect habit streak milestones
        for (const habit of habits) {
            const milestone = this.checkHabitMilestone(habit);
            if (milestone) {
                scenarios.push(await this.createHabitMilestoneScenario(userId, habit, milestone));
            }
        }

        // Detect pattern discovery
        const newPatterns = await this.checkNewPatterns(userId);
        if (newPatterns.length > 0) {
            scenarios.push(await this.createPatternDiscoveryScenario(userId, newPatterns));
        }

        return scenarios;
    }

    /**
     * Create drop-off scenario
     */
    async createDropOffScenario(userId, engagement) {
        const days = engagement.days_since_last_log;
        let campaignType;

        if (days === 1) campaignType = 'drop_off_1day';
        else if (days === 3) campaignType = 'drop_off_3day';
        else if (days === 7) campaignType = 'drop_off_1week';
        else if (days >= 14) campaignType = 'almost_churned';
        else return null;

        // Generate personalized message
        const message = await this.generateMessage(userId, campaignType, {
            days_since_last: days,
            engagement_score: engagement.engagement_score,
            total_events: engagement.total_events
        });

        // Save to database
        return await this.saveScenario(userId, campaignType, message, {
            priority: days >= 7 ? 'high' : 'medium',
            scheduled_for: this.getOptimalSendTime(userId, campaignType)
        });
    }

    /**
     * Create habit milestone scenario
     */
    async createHabitMilestoneScenario(userId, habit, milestone) {
        const message = await this.generateMessage(userId, 'habit_milestone', {
            habit_name: habit.habit_name,
            current_streak: habit.current_streak,
            milestone: milestone
        });

        return await this.saveScenario(userId, 'habit_milestone', message, {
            priority: 'low',
            scheduled_for: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours later
        });
    }

    /**
     * Generate personalized message using LLM
     */
    async generateMessage(userId, scenarioType, context) {
        const userData = await this.getUserContext(userId);

        const prompt = this.buildPrompt(scenarioType, { ...context, ...userData });

        const response = await llmService.generateText(prompt, {
            temperature: 0.8,
            maxOutputTokens: 200
        });

        // Parse JSON response
        try {
            return JSON.parse(response);
        } catch (e) {
            // Fallback if JSON parsing fails
            return {
                title: 'Memory OS Update',
                body: response.substring(0, 150),
                cta: 'Open App'
            };
        }
    }

    /**
     * Build LLM prompt based on scenario
     */
    buildPrompt(scenarioType, context) {
        const prompts = {
            drop_off_1day: `You are a supportive AI coach for Memory OS. Generate a short, motivating push notification.

User Context:
- Logged ${context.total_events} total events
- Last logged: 1 day ago  
- Current streak before drop: ${context.current_streak || 0} days

Generate a gentle reminder that:
1. Mentions their progress (${context.total_events} events)
2. Encourages them to maintain momentum
3. Keeps it short (max 100 chars)

Output JSON:
{"title": "...", "body": "...", "cta": "Log today's activity"}`,

            drop_off_3day: `Generate a push notification for a user who hasn't logged in 3 days.

User has ${context.total_events} events tracked. Show them what they're missing.

Output JSON with title, body, cta that creates FOMO but stays positive.`,

            habit_milestone: `Celebrate a habit milestone!

User achieved ${context.current_streak}-day streak for "${context.habit_name}".
Milestone: ${context.milestone}

Generate an encouraging celebration message.
Output JSON: {"title": "...", "body": "...", "cta": "View Progress"}`
        };

        return prompts[scenarioType] || prompts.drop_off_1day;
    }

    /**
     * Save scenario to database
     */
    async saveScenario(userId, campaignType, message, options = {}) {
        const query = `
      INSERT INTO nudge_campaigns (
        user_id, campaign_type, trigger_condition,
        message_title, message_body, message_cta,
        status, scheduled_for, personalization_data
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

        const values = [
            userId,
            campaignType,
            options.trigger || 'auto_detected',
            message.title,
            message.body,
            message.cta || 'Open App',
            'scheduled',
            options.scheduled_for || new Date(Date.now() + 60 * 60 * 1000), // 1 hour default
            JSON.stringify(message)
        ];

        const result = await db.query(query, values);
        return result.rows[0];
    }

    /**
     * Get user engagement data
     */
    async getEngagement(userId) {
        const query = `
      SELECT * FROM user_engagement WHERE user_id = $1
    `;
        const result = await db.query(query, [userId]);
        return result.rows[0] || { days_since_last_log: 999, total_events: 0 };
    }

    /**
     * Get active habits
     */
    async getActiveHabits(userId) {
        const query = `
      SELECT * FROM habits 
      WHERE user_id = $1 AND status = 'active'
    `;
        const result = await db.query(query, [userId]);
        return result.rows;
    }

    /**
     * Check habit milestone
     */
    checkHabitMilestone(habit) {
        const streak = habit.current_streak;
        if (streak === 3) return '3-day streak! Building momentum';
        if (streak === 7) return '1-week streak! You\'re on fire';
        if (streak === 21) return '21-day streak! Habit formed 🎉';
        return null;
    }

    /**
     * Check for new patterns
     */
    async checkNewPatterns(userId) {
        // Placeholder - would call pattern detection service
        return [];
    }

    /**
     * Get user context for personalization
     */
    async getUserContext(userId) {
        const query = `
      SELECT 
        COUNT(*) as total_events,
        ARRAY_AGG(DISTINCT category) as categories
      FROM memory_units
      WHERE user_id = $1
    `;
        const result = await db.query(query, [userId]);
        return result.rows[0] || { total_events: 0, categories: [] };
    }

    /**
     * Get optimal send time
     */
    getOptimalSendTime(userId, campaignType) {
        // Simple logic - can be enhanced with user activity patterns
        const now = new Date();
        const sendTime = new Date(now);

        if (campaignType === 'drop_off_1day') {
            sendTime.setHours(9, 0, 0); // 9 AM next day
        } else if (campaignType === 'drop_off_3day') {
            sendTime.setHours(20, 0, 0); // 8 PM same day
        } else {
            sendTime.setHours(10, 0, 0); // 10 AM
        }

        return sendTime;
    }
}

export default new ScenarioDetector();
