import CategoryModule from '../base/CategoryModule.js';
import db from '../../db/index.js';

/**
 * Health Module
 * 
 * Handles health tracking:
 * - Sleep tracking (duration, quality)
 * - Vital signs (blood pressure, heart rate, temperature)
 * - Symptoms (pain, illness, etc.)
 * - Medications & supplements
 * - Medical appointments
 */
class HealthModule extends CategoryModule {
    constructor() {
        super({
            category: 'health',
            name: 'Health & Wellness',
            version: '1.0.0'
        });
    }

    /**
     * Process health memory
     */
    async processMemory(memoryUnit) {
        const { user_id, normalized_data } = memoryUnit;

        try {
            const results = {};

            // Detect health event type
            const healthType = this.detectHealthType(normalized_data);
            results.healthType = healthType;

            // Process based on type
            switch (healthType) {
                case 'sleep':
                    results.sleepData = await this.processSleep(user_id, normalized_data);
                    break;
                case 'vitals':
                    results.vitalData = await this.processVitals(user_id, normalized_data);
                    break;
                case 'symptom':
                    results.symptomData = await this.processSymptom(user_id, normalized_data);
                    break;
                case 'medication':
                    results.medicationData = await this.processMedication(user_id, normalized_data);
                    break;
            }

            return {
                processed: true,
                ...results,
                message: `Tracked ${healthType} event`
            };
        } catch (error) {
            console.error('Health processing error:', error);
            return { processed: false, error: error.message };
        }
    }

    /**
     * Detect health event type
     */
    detectHealthType(data) {
        const text = JSON.stringify(data).toLowerCase();

        if (text.match(/sleep|slept|bed|wake|nap|rest|tired|insomnia/)) {
            return 'sleep';
        }
        if (text.match(/blood pressure|bp|heart rate|pulse|temperature|weight|bmi/)) {
            return 'vitals';
        }
        if (text.match(/pain|headache|fever|sick|ill|symptom|ache|cough|cold|flu/)) {
            return 'symptom';
        }
        if (text.match(/medication|medicine|pill|dose|supplement|vitamin|prescription/)) {
            return 'medication';
        }
        if (text.match(/doctor|appointment|checkup|hospital|clinic/)) {
            return 'appointment';
        }

        return 'general';
    }

    /**
     * Process sleep data
     */
    async processSleep(userId, data) {
        const duration = data.duration_minutes || data.duration || data.hours;
        const quality = data.quality || this.estimateSleepQuality(data);

        // Get average sleep for comparison
        const avgSleep = await this.getAverageSleep(userId);

        return {
            duration,
            quality,
            comparison: duration && avgSleep ?
                (duration > avgSleep ? 'above_average' : 'below_average') : null,
            averageSleep: avgSleep
        };
    }

    /**
     * Process vital signs
     */
    async processVitals(userId, data) {
        const vitals = {};

        if (data.blood_pressure || data.bp) {
            vitals.bloodPressure = data.blood_pressure || data.bp;
        }
        if (data.heart_rate || data.pulse) {
            vitals.heartRate = data.heart_rate || data.pulse;
        }
        if (data.temperature) {
            vitals.temperature = data.temperature;
        }
        if (data.weight) {
            vitals.weight = data.weight;
        }

        // Check for concerning values
        vitals.alerts = this.checkVitalAlerts(vitals);

        return vitals;
    }

    /**
     * Process symptom
     */
    async processSymptom(userId, data) {
        const symptom = {
            type: data.symptom_type || data.type || 'general',
            severity: data.severity || this.estimateSeverity(data),
            duration: data.duration_minutes || data.duration
        };

        // Check if recurring
        const isRecurring = await this.checkRecurringSymptom(userId, symptom.type);
        if (isRecurring) {
            symptom.recurring = true;
            symptom.recommendation = 'Consider consulting a doctor for recurring symptoms';
        }

        return symptom;
    }

    /**
     * Process medication
     */
    async processMedication(userId, data) {
        return {
            name: data.medication || data.name,
            dosage: data.dosage || data.dose,
            time: data.time || new Date().toISOString(),
            adherence: await this.checkMedicationAdherence(userId, data.medication)
        };
    }

    /**
     * Get average sleep duration
     */
    async getAverageSleep(userId) {
        const query = `
            SELECT AVG((normalized_data->>'duration_minutes')::numeric) as avg_duration
            FROM memory_units
            WHERE user_id = $1
              AND category = 'health'
              AND normalized_data->>'type' = 'sleep'
              AND created_at >= NOW() - INTERVAL '30 days'
        `;

        try {
            const result = await db.query(query, [userId]);
            return result.rows[0]?.avg_duration ? parseFloat(result.rows[0].avg_duration) : null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Estimate sleep quality from context
     */
    estimateSleepQuality(data) {
        const text = JSON.stringify(data).toLowerCase();

        if (text.match(/great|excellent|well|refreshed|good/)) return 'good';
        if (text.match(/poor|bad|restless|interrupted/)) return 'poor';
        return 'average';
    }

    /**
     * Check vital signs for alerts
     */
    checkVitalAlerts(vitals) {
        const alerts = [];

        if (vitals.bloodPressure) {
            const [systolic, diastolic] = vitals.bloodPressure.split('/').map(Number);
            if (systolic > 140 || diastolic > 90) {
                alerts.push({ type: 'warning', message: 'High blood pressure detected' });
            }
        }

        if (vitals.heartRate) {
            if (vitals.heartRate > 100) {
                alerts.push({ type: 'info', message: 'Elevated heart rate' });
            }
        }

        return alerts;
    }

    /**
     * Estimate symptom severity
     */
    estimateSeverity(data) {
        const text = JSON.stringify(data).toLowerCase();

        if (text.match(/severe|extreme|unbearable|emergency/)) return 'high';
        if (text.match(/moderate|noticeable/)) return 'medium';
        return 'low';
    }

    /**
     * Check for recurring symptoms
     */
    async checkRecurringSymptom(userId, symptomType) {
        const query = `
            SELECT COUNT(*) as count
            FROM memory_units
            WHERE user_id = $1
              AND category = 'health'
              AND normalized_data->>'symptom_type' = $2
              AND created_at >= NOW() - INTERVAL '30 days'
        `;

        try {
            const result = await db.query(query, [userId, symptomType]);
            return parseInt(result.rows[0].count) >= 3; // 3+ occurrences = recurring
        } catch (error) {
            return false;
        }
    }

    /**
     * Check medication adherence
     */
    async checkMedicationAdherence(userId, medicationName) {
        // Simple adherence check - count doses taken
        const query = `
            SELECT COUNT(*) as count
            FROM memory_units
            WHERE user_id = $1
              AND category = 'health'
              AND normalized_data->> 'medication' = $2
              AND created_at >= NOW() - INTERVAL '7 days'
        `;

        try {
            const result = await db.query(query, [userId, medicationName]);
            const count = parseInt(result.rows[0].count);

            // Assume daily medication, 7 days = 100% adherence
            return {
                doses_taken: count,
                adherence_rate: Math.min((count / 7) * 100, 100)
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * Generate health insights
     */
    async generateInsights(userId, timeRange = {}) {
        const insights = [];

        // Sleep insights
        const sleepInsight = await this.analyzeSleep(userId);
        if (sleepInsight.insight) {
            insights.push(sleepInsight.insight);
        }

        // Symptom patterns
        const symptomInsight = await this.analyzeSymptomPatterns(userId);
        if (symptomInsight.insight) {
            insights.push(symptomInsight.insight);
        }

        return insights;
    }

    async analyzeSleep(userId) {
        const avgSleep = await this.getAverageSleep(userId);

        if (avgSleep && avgSleep < 360) { // Less than 6 hours
            return {
                insight: {
                    type: 'warning',
                    category: 'health',
                    title: 'Sleep Deficit',
                    description: `Your average sleep is ${Math.round(avgSleep / 60)} hours. Aim for 7-9 hours for optimal health.`,
                    priority: 'high'
                }
            };
        } else if (avgSleep && avgSleep >= 420) { // 7+ hours
            return {
                insight: {
                    type: 'achievement',
                    category: 'health',
                    title: 'Great Sleep Routine',
                    description: `You're averaging ${Math.round(avgSleep / 60)} hours of sleep. Keep it up! 😴`,
                    priority: 'low'
                }
            };
        }

        return {};
    }

    async analyzeSymptomPatterns(userId) {
        // TODO: Implement symptom pattern analysis
        return {};
    }

    /**
     * Get module metadata
     */
    getMetadata() {
        return {
            ...super.getMetadata(),
            capabilities: {
                processMemory: true,
                generateInsights: true,
                trackSleep: true,
                trackVitals: true,
                trackSymptoms: true,
                trackMedications: true
            },
            supportedTypes: [
                'sleep', 'vitals', 'symptoms', 'medications', 'appointments'
            ]
        };
    }
}

export default HealthModule;
