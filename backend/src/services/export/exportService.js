import { query as db } from '../../db/index.js';
import { adherenceCalculator } from '../analytics/adherenceCalculator.js';
import PDFDocument from 'pdfkit';
import nodemailer from 'nodemailer';

/**
 * Export Service
 * Handles data export in various formats
 */
export class ExportService {
    constructor() {
        // Email transporter (configure with your SMTP)
        this.emailTransporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.SMTP_PORT || 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    /**
     * Export user data based on command
     */
    async export(userId, domain = 'all', format = 'pdf') {
        const user = await this.getUser(userId);

        // Get data based on domain
        const data = await this.getData(userId, domain);

        // Generate export
        let file;
        if (format === 'pdf') {
            file = await this.generatePDF(user, data, domain);
        } else if (format === 'json') {
            file = await this.generateJSON(data);
        } else if (format === 'csv') {
            file = await this.generateCSV(data);
        }

        return file;
    }

    /**
     * Get user data for export
     */
    async getData(userId, domain) {
        let query;
        let params = [userId];

        if (domain === 'medications' || domain === 'medication') {
            query = `
        SELECT *
        FROM memory_units
        WHERE user_id = ?
          AND intent = 'TRACK_MEDICATION'
          AND status != 'deleted'
        ORDER BY created_at DESC
      `;
        } else if (domain === 'expenses' || domain === 'finance') {
            query = `
        SELECT *
        FROM memory_units
        WHERE user_id = ?
          AND intent = 'TRACK_EXPENSE'
          AND status != 'deleted'
        ORDER BY created_at DESC
      `;
        } else {
            // All data
            query = `
        SELECT *
        FROM memory_units
        WHERE user_id = ?
          AND status != 'deleted'
        ORDER BY created_at DESC
      `;
        }

        return await db.query(query, params);
    }

    /**
     * Generate PDF report
     */
    async generatePDF(user, data, domain) {
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument();
            const chunks = [];

            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // Header
            doc.fontSize(20).text('Memory OS - Data Export', { align: 'center' });
            doc.fontSize(12).text(`User: ${user.email}`, { align: 'center' });
            doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
            doc.moveDown(2);

            // Domain-specific content
            if (domain === 'medications' || domain === 'medication') {
                this.addMedicationSection(doc, data);
            } else if (domain === 'expenses' || domain === 'finance') {
                this.addFinanceSection(doc, data);
            } else {
                this.addAllDataSection(doc, data);
            }

            doc.end();
        });
    }

    /**
     * Add medication section to PDF
     */
    async addMedicationSection(doc, data) {
        doc.fontSize(16).text('Medication History', { underline: true });
        doc.moveDown();

        // Group by medication
        const byMedication = {};
        data.forEach(entry => {
            const signals = JSON.parse(entry.signals || '{}');
            const med = signals.medication || 'Unknown';
            if (!byMedication[med]) byMedication[med] = [];
            byMedication[med].push(entry);
        });

        for (const [medication, entries] of Object.entries(byMedication)) {
            doc.fontSize(14).text(medication, { bold: true });
            doc.fontSize(10).text(`Total logs: ${entries.length}`);
            doc.fontSize(10).text(`First: ${new Date(entries[entries.length - 1].created_at).toLocaleDateString()}`);
            doc.fontSize(10).text(`Last: ${new Date(entries[0].created_at).toLocaleDateString()}`);
            doc.moveDown(0.5);

            // Recent entries
            doc.fontSize(10).text('Recent entries:');
            entries.slice(0, 10).forEach(entry => {
                const date = new Date(entry.created_at).toLocaleString();
                doc.fontSize(9).text(`  • ${date} - ${entry.raw_input}`);
            });

            doc.moveDown();
        }
    }

    /**
     * Add finance section to PDF
     */
    async addFinanceSection(doc, data) {
        doc.fontSize(16).text('Financial History', { underline: true });
        doc.moveDown();

        // Calculate totals
        let total = 0;
        const byCategory = {};

        data.forEach(entry => {
            const signals = JSON.parse(entry.signals || '{}');
            const amount = parseFloat(signals.amount || 0);
            const category = signals.description || 'Other';

            total += amount;
            if (!byCategory[category]) byCategory[category] = 0;
            byCategory[category] += amount;
        });

        doc.fontSize(14).text(`Total Expenses: $${total.toFixed(2)}`, { bold: true });
        doc.moveDown();

        // By category
        doc.fontSize(12).text('By Category:');
        for (const [category, amount] of Object.entries(byCategory)) {
            doc.fontSize(10).text(`  ${category}: $${amount.toFixed(2)}`);
        }

        doc.moveDown();

        // Recent transactions
        doc.fontSize(12).text('Recent Transactions:');
        data.slice(0, 20).forEach(entry => {
            const signals = JSON.parse(entry.signals || '{}');
            const date = new Date(entry.created_at).toLocaleDateString();
            doc.fontSize(9).text(`  • ${date}: $${signals.amount} - ${signals.description}`);
        });
    }

    /**
     * Add all data section to PDF
     */
    async addAllDataSection(doc, data) {
        doc.fontSize(16).text('All Activity', { underline: true });
        doc.moveDown();

        // Group by intent
        const byIntent = {};
        data.forEach(entry => {
            const intent = entry.intent || 'GENERAL_LOG';
            if (!byIntent[intent]) byIntent[intent] = [];
            byIntent[intent].push(entry);
        });

        for (const [intent, entries] of Object.entries(byIntent)) {
            doc.fontSize(14).text(intent.replace('_', ' '), { bold: true });
            doc.fontSize(10).text(`Total: ${entries.length} entries`);

            entries.slice(0, 5).forEach(entry => {
                const date = new Date(entry.created_at).toLocaleString();
                doc.fontSize(9).text(`  • ${date}: ${entry.raw_input}`);
            });

            doc.moveDown();
        }
    }

    /**
     * Generate JSON export
     */
    async generateJSON(data) {
        return Buffer.from(JSON.stringify(data, null, 2));
    }

    /**
     * Generate CSV export
     */
    async generateCSV(data) {
        const headers = ['Date', 'Type', 'Content', 'Intent', 'Signals'];
        const rows = data.map(entry => [
            new Date(entry.created_at).toISOString(),
            entry.intent || '',
            entry.raw_input,
            entry.intent || '',
            JSON.stringify(JSON.parse(entry.signals || '{}'))
        ]);

        const csv = [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');

        return Buffer.from(csv);
    }

    /**
     * Send export via email
     */
    async sendEmail(userId, fileBuffer, filename, domain) {
        const user = await this.getUser(userId);

        await this.emailTransporter.sendMail({
            from: process.env.SMTP_FROM || 'noreply@memoryos.app',
            to: user.email,
            subject: `Your Memory OS ${domain} Export`,
            text: `Hi ${user.email},\n\nYour requested data export is attached.\n\nBest regards,\nMemory OS`,
            attachments: [{
                filename,
                content: fileBuffer
            }]
        });
    }

    /**
     * Get user info
     */
    async getUser(userId) {
        const users = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
        return users[0];
    }
}

export const exportService = new ExportService();
