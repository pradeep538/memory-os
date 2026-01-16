import { query as db } from '../../db/index.js';
import crypto from 'crypto';

/**
 * Adherence Calculator for Medication Tracking
 * Provides deterministic calculation of medication adherence
 */
export class AdherenceCalculator {
    /**
     * Calculate medication adherence for a given period
     */
    async calculateAdherence(userId, medicationName, days = 30) {
        // Get all medication logs for the period
        const logs = await db.query(`
      SELECT DISTINCT DATE(created_at) as dose_date, COUNT(*) as doses
      FROM memory_units
      WHERE user_id = ?
        AND category = 'medication'
        AND raw_input ILIKE ?
        AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY dose_date
    `, [userId, `%${medicationName}%`]);

        // Calculate metrics
        const actualDays = logs.length;
        const expectedDays = days;
        const adherenceRate = actualDays / expectedDays;
        const adherencePercentage = Math.round(adherenceRate * 100);

        // Calculate streak
        const streak = this.calculateCurrentStreak(logs.map(l => l.dose_date));

        // Find gaps
        const gaps = this.findGaps(logs.map(l => l.dose_date), days);

        // Calculate checksum for determinism verification
        const checksum = this.generateChecksum({
            userId,
            medicationName,
            days,
            logs: logs.map(l => ({ date: l.dose_date, doses: l.doses }))
        });

        return {
            medication: medicationName,
            period_days: days,
            actual_days: actualDays,
            expected_days: expectedDays,
            adherence_percentage: adherencePercentage,
            adherence_rate: Math.round(adherenceRate * 1000) / 1000,
            current_streak: streak,
            missed_days: expectedDays - actualDays,
            gaps,
            total_doses: logs.reduce((sum, l) => sum + l.doses, 0),
            checksum,
            calculated_at: new Date().toISOString()
        };
    }

    /**
     * Calculate current streak (consecutive days with doses)
     */
    calculateCurrentStreak(doseDates) {
        if (doseDates.length === 0) return 0;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Sort in descending order
        const sorted = doseDates
            .map(d => new Date(d))
            .sort((a, b) => b - a);

        let streak = 0;
        let checkDate = new Date(today);

        for (const doseDate of sorted) {
            doseDate.setHours(0, 0, 0, 0);

            // Check if this date matches expected date
            if (doseDate.getTime() === checkDate.getTime()) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else if (doseDate < checkDate) {
                // Gap found, streak broken
                break;
            }
        }

        return streak;
    }

    /**
     * Find gaps in medication adherence
     */
    findGaps(doseDates, totalDays) {
        const gaps = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const doseSet = new Set(
            doseDates.map(d => {
                const date = new Date(d);
                date.setHours(0, 0, 0, 0);
                return date.getTime();
            })
        );

        let currentGap = null;

        for (let i = 0; i < totalDays; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(checkDate.getDate() - i);
            checkDate.setHours(0, 0, 0, 0);

            const hasDose = doseSet.has(checkDate.getTime());

            if (!hasDose) {
                if (!currentGap) {
                    currentGap = {
                        start_date: checkDate.toISOString().split('T')[0],
                        days: 1
                    };
                } else {
                    currentGap.days++;
                    currentGap.end_date = checkDate.toISOString().split('T')[0];
                }
            } else if (currentGap) {
                gaps.push(currentGap);
                currentGap = null;
            }
        }

        if (currentGap) {
            gaps.push(currentGap);
        }

        return gaps.reverse();
    }

    /**
     * Get adherence alerts
     */
    async getAdherenceAlerts(userId, medicationName, days = 30) {
        const adherence = await this.calculateAdherence(userId, medicationName, days);
        const alerts = [];

        // Critical: < 80% adherence
        if (adherence.adherence_percentage < 80) {
            alerts.push({
                level: 'critical',
                message: `Low adherence: ${adherence.adherence_percentage}% (expected 80%+)`,
                data: adherence
            });
        }

        // Warning: 3+ consecutive missed days
        const longestGap = adherence.gaps.reduce((max, gap) =>
            Math.max(max, gap.days), 0
        );

        if (longestGap >= 3) {
            alerts.push({
                level: 'warning',
                message: `${longestGap} consecutive days missed`,
                data: adherence.gaps.find(g => g.days === longestGap)
            });
        }

        // Info: Perfect adherence
        if (adherence.adherence_percentage === 100) {
            alerts.push({
                level: 'success',
                message: `Perfect adherence: ${adherence.current_streak} day streak!`,
                data: adherence
            });
        }

        return alerts;
    }

    /**
     * Generate deterministic checksum
     */
    generateChecksum(data) {
        const str = JSON.stringify(data, Object.keys(data).sort());
        return crypto.createHash('sha256').update(str).digest('hex').substring(0, 16);
    }

    /**
     * Verify adherence calculation is deterministic
     */
    async verifyDeterminism(userId, medicationName, days = 30, iterations = 3) {
        const results = [];

        for (let i = 0; i < iterations; i++) {
            const adherence = await this.calculateAdherence(userId, medicationName, days);
            results.push(adherence.checksum);
        }

        // All checksums should be identical
        const allSame = results.every(c => c === results[0]);

        return {
            is_deterministic: allSame,
            checksums: results,
            iterations
        };
    }
}

export const adherenceCalculator = new AdherenceCalculator();
