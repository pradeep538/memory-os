import { query as db } from '../../db/index.js';
import crypto from 'crypto';

/**
 * Validation Service for Critical Data
 * Ensures deterministic, production-ready handling of medications, finance, etc.
 */
export class ValidationService {
    /**
     * Validate medication log before insertion
     */
    async validateMedicationLog(userId, input, timestamp = new Date()) {
        const errors = [];

        // Extract medication name
        const medicationMatch = input.match(/\b(took|had|consumed|taken)\s+([a-zA-Z\s\-]+)/i);
        const medication = medicationMatch ? medicationMatch[2].trim() : null;

        if (!medication) {
            errors.push('Could not identify medication name');
            return { valid: false, errors };
        }

        // 1. Check for duplicates within time window (12 hours)
        const duplicateWindow = 12 * 60 * 60 * 1000; // 12 hours in ms
        const windowStart = new Date(timestamp.getTime() - duplicateWindow);
        const windowEnd = new Date(timestamp.getTime() + duplicateWindow);

        const duplicates = await db.query(`
      SELECT id, raw_input, created_at
      FROM memory_units
      WHERE user_id = ?
        AND category = 'medication'
        AND raw_input ILIKE ?
        AND created_at BETWEEN ? AND ?
    `, [userId, `%${medication}%`, windowStart.toISOString(), windowEnd.toISOString()]);

        if (duplicates.length > 0) {
            const existing = duplicates[0];
            const hoursDiff = Math.abs(new Date(existing.created_at) - timestamp) / (1000 * 60 * 60);
            errors.push(`Duplicate: "${medication}" already logged ${hoursDiff.toFixed(1)} hours ago`);
            return { valid: false, errors, duplicate: existing };
        }

        // 2. Check backdating limit (max 2 hours in past)
        const maxBackdateHours = 2;
        const now = new Date();
        const hoursSinceLog = (now - timestamp) / (1000 * 60 * 60);

        if (hoursSinceLog > maxBackdateHours) {
            errors.push(`Cannot backdate more than ${maxBackdateHours} hours (attempted ${hoursSinceLog.toFixed(1)} hours ago)`);
            return { valid: false, errors };
        }

        // 3. Future date check
        if (timestamp > now) {
            errors.push('Cannot log future medications');
            return { valid: false, errors };
        }

        return {
            valid: true,
            errors: [],
            metadata: {
                medication,
                validated_at: now.toISOString(),
                checksum: this.generateChecksum({ userId, medication, timestamp })
            }
        };
    }

    /**
     * Validate financial transaction
     */
    async validateFinancialTransaction(userId, input, amount, timestamp = new Date()) {
        const errors = [];

        // 1. Amount validation
        if (amount === null || amount === undefined) {
            errors.push('Amount is required for financial transactions');
            return { valid: false, errors };
        }

        if (typeof amount !== 'number' || isNaN(amount)) {
            errors.push('Amount must be a valid number');
            return { valid: false, errors };
        }

        if (amount < 0.01 || amount > 1000000) {
            errors.push('Amount must be between $0.01 and $1,000,000');
            return { valid: false, errors };
        }

        // 2. Precision check (max 2 decimal places)
        const roundedAmount = Math.round(amount * 100) / 100;
        if (Math.abs(amount - roundedAmount) > 0.001) {
            errors.push('Amount must have at most 2 decimal places');
            return { valid: false, errors };
        }

        // 3. Check for exact duplicates (same amount, same description, within 5 minutes)
        const duplicateWindow = 5 * 60 * 1000; // 5 minutes
        const windowStart = new Date(timestamp.getTime() - duplicateWindow);
        const windowEnd = new Date(timestamp.getTime() + duplicateWindow);

        const duplicates = await db.query(`
      SELECT id, raw_input, created_at, normalized_data
      FROM memory_units
      WHERE user_id = ?
        AND category = 'finance'
        AND normalized_data->>'amount' = ?
        AND created_at BETWEEN ? AND ?
    `, [userId, roundedAmount.toString(), windowStart.toISOString(), windowEnd.toISOString()]);

        if (duplicates.length > 0) {
            errors.push('Duplicate transaction detected within 5 minutes');
            return { valid: false, errors, duplicate: duplicates[0] };
        }

        // 4. Backdate limit (max 7 days for finance)
        const maxBackdateDays = 7;
        const now = new Date();
        const daysSinceLog = (now - timestamp) / (1000 * 60 * 60 * 24);

        if (daysSinceLog > maxBackdateDays) {
            errors.push(`Cannot backdate more than ${maxBackdateDays} days`);
            return { valid: false, errors };
        }

        return {
            valid: true,
            errors: [],
            metadata: {
                amount: roundedAmount,
                validated_at: now.toISOString(),
                checksum: this.generateChecksum({ userId, amount: roundedAmount, timestamp })
            }
        };
    }

    /**
     * Generate deterministic checksum for validation
     */
    generateChecksum(data) {
        const str = JSON.stringify(data, Object.keys(data).sort());
        return crypto.createHash('sha256').update(str).digest('hex').substring(0, 16);
    }

    /**
     * Verify checksum matches
     */
    verifyChecksum(data, expectedChecksum) {
        const actualChecksum = this.generateChecksum(data);
        return actualChecksum === expectedChecksum;
    }
}

export const validationService = new ValidationService();
