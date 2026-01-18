
import { query } from '../../db/index.js';
import { DateTime } from 'luxon'; // Assuming luxon is available, or use Intl

class TimeService {
    /**
     * Get user's timezone preference
     * Default to UTC if not set
     */
    async getUserTimezone(userId) {
        // TODO: Add caching (Redis/Memory)
        const sql = 'SELECT timezone FROM users WHERE id = $1';
        const result = await query(sql, [userId]);
        return result.rows[0]?.timezone || 'UTC';
    }

    /**
     * Convert a UTC date to User's Local Time (ISO string or formatted)
     */
    async toUserTime(userId, dateObj) {
        const tz = await this.getUserTimezone(userId);
        return DateTime.fromJSDate(dateObj).setZone(tz);
    }

    /**
     * Get "Now" in User's Timezone
     */
    async getUserNow(userId) {
        const tz = await this.getUserTimezone(userId);
        return DateTime.now().setZone(tz);
    }

    /**
     * Get the "Start of Day" for a user (for daily resets)
     * e.g. 00:00:00 in their timezone, converted to UTC timestamp
     */
    async getStartOfDay(userId, date = new Date()) {
        const tz = await this.getUserTimezone(userId);
        return DateTime.fromJSDate(date).setZone(tz).startOf('day').toJSDate();
    }

    /**
     * Format a time for LLM/Display
     * e.g. "8:00 AM" (User Time)
     * Input: UTC Date or ISO String
     */
    async formatTimeForUser(userIdOrTimezone, utcInput, format = 'h:mm a') {
        let tz = userIdOrTimezone;
        if (userIdOrTimezone.includes('-') && !userIdOrTimezone.includes('/')) {
            // Assume UUID -> fetch timezone
            tz = await this.getUserTimezone(userIdOrTimezone);
        }

        const dt = typeof utcInput === 'string'
            ? DateTime.fromISO(utcInput, { zone: 'utc' })
            : DateTime.fromJSDate(utcInput, { zone: 'utc' });

        return dt.setZone(tz).toFormat(format);
    }
}

export default new TimeService();
