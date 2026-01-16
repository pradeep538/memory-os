import { query as db } from '../../db/index.js';
import MemoryModel from '../../models/memory.model.js';

/**
 * Correction Handler
 * Handles edit, delete, and undo commands via natural language
 */
export class CorrectionHandler {
    /**
     * Detect if input is a correction command
     */
    isCorrectionCommand(input) {
        const lowerInput = input.toLowerCase().trim();

        // Undo patterns
        const undoPatterns = [
            /^undo( last)?$/,
            /^delete (that|last|it)$/,
            /^remove (that|last|it)$/,
            /^cancel( that)?$/
        ];

        // Edit patterns
        const editPatterns = [
            /^actually,?\s+(.+)$/,
            /^i meant\s+(.+)$/,
            /^change (that|it) to\s+(.+)$/,
            /^correction:?\s+(.+)$/,
            /^no,?\s+(.+)$/
        ];

        for (const pattern of undoPatterns) {
            if (pattern.test(lowerInput)) {
                return { type: 'undo', pattern };
            }
        }

        for (const pattern of editPatterns) {
            const match = lowerInput.match(pattern);
            if (match) {
                return {
                    type: 'edit',
                    newValue: match[match.length - 1].trim(),
                    pattern
                };
            }
        }

        return { type: null };
    }

    /**
     * Get last action for user (from session)
     */
    async getLastAction(userId) {
        const lastEntry = await db.query(`
      SELECT *
      FROM memory_units
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `, [userId]);

        if (lastEntry.length === 0) {
            return null;
        }

        return lastEntry[0];
    }

    /**
     * Handle undo command
     */
    async handleUndo(userId) {
        const lastEntry = await this.getLastAction(userId);

        if (!lastEntry) {
            return {
                success: false,
                message: "No recent entries to undo"
            };
        }

        // Soft delete with audit trail
        await MemoryModel.update(lastEntry.id, userId, {
            status: 'deleted',
            deleted_at: new Date(),
            deleted_reason: 'user_undo'
        });

        return {
            success: true,
            message: `✓ Removed: "${lastEntry.raw_input}"`,
            deletedEntry: lastEntry
        };
    }

    /**
     * Handle edit command
     */
    async handleEdit(userId, newValue) {
        const lastEntry = await this.getLastAction(userId);

        if (!lastEntry) {
            return {
                success: false,
                message: "No recent entries to edit"
            };
        }

        // Determine what field to update based on intent
        const updates = await this.extractUpdates(lastEntry, newValue);

        if (!updates) {
            return {
                success: false,
                message: "Couldn't understand what to change"
            };
        }

        // Create audit trail
        await db.query(`
      INSERT INTO audit_log (
        table_name, record_id, operation, user_id,
        old_values, new_values, request_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
            'memory_units',
            lastEntry.id,
            'UPDATE',
            userId,
            JSON.stringify(lastEntry),
            JSON.stringify(updates),
            `edit_${Date.now()}`
        ]);

        // Update entry
        await MemoryModel.update(lastEntry.id, userId, {
            ...updates,
            edited_at: new Date(),
            edit_count: (lastEntry.edit_count || 0) + 1
        });

        return {
            success: true,
            message: this.generateEditConfirmation(lastEntry, updates),
            oldEntry: lastEntry,
            updates
        };
    }

    /**
     * Extract what to update from correction text
     */
    async extractUpdates(lastEntry, newValue) {
        const intent = lastEntry.intent;
        const signals = JSON.parse(lastEntry.signals || '{}');

        // Amount corrections (finance)
        if (intent === 'TRACK_EXPENSE') {
            const amountMatch = newValue.match(/\$?(\d+\.?\d*)/);
            if (amountMatch) {
                return {
                    signals: JSON.stringify({
                        ...signals,
                        amount: parseFloat(amountMatch[1])
                    })
                };
            }
        }

        // Medication corrections
        if (intent === 'TRACK_MEDICATION') {
            const medMatch = newValue.match(/([a-zA-Z\s]+)/);
            if (medMatch) {
                return {
                    signals: JSON.stringify({
                        ...signals,
                        medication: medMatch[1].trim()
                    })
                };
            }
        }

        // Duration corrections
        const durationMatch = newValue.match(/(\d+)\s*(minutes?|mins?|hours?|hrs?)/i);
        if (durationMatch) {
            let duration = parseInt(durationMatch[1]);
            if (durationMatch[2].toLowerCase().startsWith('h')) {
                duration *= 60;
            }
            return {
                signals: JSON.stringify({
                    ...signals,
                    duration
                })
            };
        }

        // Generic text replacement
        return {
            raw_input: newValue,
            signals: JSON.stringify({ corrected_from: lastEntry.raw_input })
        };
    }

    /**
     * Generate confirmation message for edit
     */
    generateEditConfirmation(oldEntry, updates) {
        const oldSignals = JSON.parse(oldEntry.signals || '{}');
        const newSignals = JSON.parse(updates.signals || '{}');

        // Amount change
        if (oldSignals.amount && newSignals.amount) {
            return `✓ Updated expense: $${oldSignals.amount} → $${newSignals.amount}`;
        }

        // Medication change
        if (oldSignals.medication && newSignals.medication) {
            return `✓ Updated medication: ${oldSignals.medication} → ${newSignals.medication}`;
        }

        // Duration change
        if (oldSignals.duration && newSignals.duration) {
            return `✓ Updated duration: ${oldSignals.duration}min → ${newSignals.duration}min`;
        }

        // Generic
        if (updates.raw_input) {
            return `✓ Updated: "${oldEntry.raw_input}" → "${updates.raw_input}"`;
        }

        return '✓ Entry updated';
    }

    /**
     * Get user's correction history (for analytics)
     */
    async getCorrectionStats(userId) {
        const stats = await db.query(`
      SELECT 
        COUNT(*) as total_corrections,
        COUNT(DISTINCT DATE(edited_at)) as days_with_corrections,
        AVG(edit_count) as avg_edits_per_entry
      FROM memory_units
      WHERE user_id = ?
        AND edited_at IS NOT NULL
    `, [userId]);

        return stats[0] || { total_corrections: 0 };
    }
}

export const correctionHandler = new CorrectionHandler();
