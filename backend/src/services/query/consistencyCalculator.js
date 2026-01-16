export class ConsistencyCalculator {
    /**
     * Calculate consistency data for a subject over time period
     */
    async calculate(userId, subject, keywords, days = 7, db) {
        // Get all occurrences
        const conditions = keywords.map(() => 'raw_input ILIKE ?').join(' OR ');
        const params = [userId, days, ...keywords.map(k => `%${k}%`)];

        const results = await db.query(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM memory_units
      WHERE user_id = ?
        AND created_at >= datetime('now', '-' || ? || ' days')
        AND (${conditions})
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, params);

        // Build pattern bitmap
        const pattern = this.buildPattern(results, days);

        // Calculate stats
        const totalLogged = results.length;
        const adherence = Math.round((totalLogged / days) * 100);
        const streak = this.calculateStreak(pattern);

        return {
            pattern,
            adherence_percentage: adherence,
            current_streak: streak,
            total_logged: totalLogged,
            days_tracked: days
        };
    }

    /**
     * Build bitmap pattern for visualization
     * Returns array of 0s and 1s representing days
     */
    buildPattern(results, days) {
        const pattern = Array(days).fill(0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        results.forEach(row => {
            const rowDate = new Date(row.date);
            rowDate.setHours(0, 0, 0, 0);

            const dayIndex = Math.floor((today - rowDate) / (1000 * 60 * 60 * 24));

            if (dayIndex >= 0 && dayIndex < days) {
                pattern[days - 1 - dayIndex] = row.count > 0 ? 1 : 0;
            }
        });

        return pattern;
    }

    /**
     * Calculate current streak from pattern
     */
    calculateStreak(pattern) {
        let streak = 0;

        // Count from the end (most recent)
        for (let i = pattern.length - 1; i >= 0; i--) {
            if (pattern[i] === 1) {
                streak++;
            } else {
                break;
            }
        }

        return streak;
    }

    /**
     * Get detailed consistency breakdown
     */
    async getDetailed(userId, subject, keywords, db) {
        const conditions = keywords.map(() => 'raw_input ILIKE ?').join(' OR ');
        const params = [userId, ...keywords.map(k => `%${k}%`)];

        const weekly = await this.calculate(userId, subject, keywords, 7, db);
        const monthly = await this.calculate(userId, subject, keywords, 30, db);

        // Get all-time stats
        const allTime = await db.query(`
      SELECT 
        COUNT(*) as total,
        MIN(created_at) as first_log,
        MAX(created_at) as last_log
      FROM memory_units
      WHERE user_id = ?
        AND (${conditions})
    `, params);

        return {
            weekly,
            monthly,
            all_time: {
                total: allTime[0].total,
                first_log: allTime[0].first_log,
                last_log: allTime[0].last_log
            }
        };
    }
}

export const consistencyCalculator = new ConsistencyCalculator();
