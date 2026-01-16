import { query as db } from '../../db/index.js';

/**
 * RPG Stats Calculator
 * Gamifies user progress with levels, XP, streaks, health, and character classes
 */
export class RpgStatsCalculator {

    /**
     * Calculate complete RPG stats for a user
     */
    async calculateUserStats(userId) {
        const [level, xp] = await this.calculateLevel(userId);
        const streak = await this.calculateStreak(userId);
        const health = await this.calculateHealth(userId);
        const characterClass = await this.determineClass(userId);

        return {
            level,
            xp: {
                current: xp * 100, // Convert to 0-1000 scale
                next: 1000,
                percentage: xp * 100
            },
            streak,
            health: Math.round(health),
            class: characterClass,
            classIcon: this.getClassIcon(characterClass)
        };
    }

    /**
     * Calculate user level and XP
     * Level = Total active days / 10
     * XP = Progress within current level (0-10 days)
     */
    async calculateLevel(userId) {
        const result = await db.query(`
      SELECT COUNT(DISTINCT DATE(created_at)) as total_days
      FROM memory_units
      WHERE user_id = ?
        AND status IN ('validated', 'enhanced')
        AND created_at > NOW() - INTERVAL '365 days'
    `, [userId]);

        const totalDays = result[0]?.total_days || 0;
        const level = Math.floor(totalDays / 10) + 1; // Start at level 1
        const xp = (totalDays % 10) / 10; // 0.0 to 1.0

        return [level, xp];
    }

    /**
     * Calculate current streak (consecutive days)
     */
    async calculateStreak(userId) {
        const logs = await db.query(`
      SELECT DISTINCT DATE(created_at) as log_date
      FROM memory_units
      WHERE user_id = ?
        AND status IN ('validated', 'enhanced')
      ORDER BY log_date DESC
      LIMIT 365
    `, [userId]);

        if (logs.length === 0) return 0;

        let streak = 0;
        let currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);

        for (const log of logs) {
            const logDate = new Date(log.log_date);
            logDate.setHours(0, 0, 0, 0);

            const diffDays = Math.floor((currentDate - logDate) / (1000 * 60 * 60 * 24));

            if (diffDays === streak || (streak === 0 && diffDays <= 1)) {
                streak++;
                currentDate = logDate;
            } else {
                break;
            }
        }

        return streak;
    }

    /**
     * Calculate health (average adherence for critical intents)
     */
    async calculateHealth(userId) {
        // Get scheduled routines
        const routines = await db.query(`
      SELECT id, frequency
      FROM routine_schedules
      WHERE user_id = ?
        AND is_active = true
    `, [userId]);

        if (routines.length === 0) return 100; // Perfect health if no routines

        let totalAdherence = 0;

        for (const routine of routines) {
            const adherence = await this.calculateRoutineAdherence(userId, routine.id);
            totalAdherence += adherence;
        }

        return routines.length > 0 ? totalAdherence / routines.length : 100;
    }

    /**
     * Calculate adherence for a specific routine (last 7 days)
     */
    async calculateRoutineAdherence(userId, routineId) {
        const result = await db.query(`
      SELECT COUNT(*) as completed
      FROM memory_units mu
      WHERE mu.user_id = ?
        AND mu.created_at > NOW() - INTERVAL '7 days'
        AND mu.status = 'validated'
    `, [userId]);

        const completed = result[0]?.completed || 0;
        const expected = 7; // Last 7 days

        return (completed / expected) * 100;
    }

    /**
     * Determine character class based on primary activity
     */
    async determineClass(userId) {
        const result = await db.query(`
      SELECT intent, COUNT(*) as count
      FROM memory_units
      WHERE user_id = ?
        AND intent IS NOT NULL
        AND created_at > NOW() - INTERVAL '30 days'
      GROUP BY intent
      ORDER BY count DESC
      LIMIT 1
    `, [userId]);

        if (result.length === 0) return 'wanderer';

        const primaryIntent = result[0].intent;

        const classMap = {
            'TRACK_MEDICATION': 'healer',
            'BUILD_HABIT': 'warrior',
            'LEARN_SKILL': 'mage',
            'TRACK_EXPENSE': 'merchant',
            'LOG_HEALTH': 'monk',
            'TRACK_ROUTINE': 'guardian'
        };

        return classMap[primaryIntent] || 'wanderer';
    }

    /**
     * Get icon for character class
     */
    getClassIcon(className) {
        const icons = {
            'healer': '💊',
            'warrior': '⚔️',
            'mage': '🧙',
            'merchant': '💰',
            'monk': '🧘',
            'guardian': '🛡️',
            'wanderer': '🌟'
        };

        return icons[className] || '🌟';
    }

    /**
     * Get XP gain amount for an action
     */
    getXpGain(intent) {
        const xpMap = {
            'TRACK_MEDICATION': 10,
            'BUILD_HABIT': 15,
            'LEARN_SKILL': 20,
            'TRACK_EXPENSE': 5,
            'LOG_HEALTH': 10,
            'TRACK_ROUTINE': 10,
            'GENERAL_LOG': 5
        };

        return xpMap[intent] || 5;
    }
}

export const rpgStatsCalculator = new RpgStatsCalculator();
