
import PgBoss from 'pg-boss';
import pool from '../db/index.js';

const queue = new PgBoss({
    db: { executeSql: (text, values) => pool.query(text, values) },
    application_name: 'memory-os-queue',
    // Connection Stability Settings
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    // Retention policy: keep 7 days of completed jobs, 7 days of failed jobs
    deleteAfterDays: 7,
    archiveCompletedAfterSeconds: 3600, // Archive (move to separate table) 1 hour after completion
    monitorStateIntervalSeconds: 300 // Reduced frequency to save connections
});

// Log errors
queue.on('error', error => console.error('Queue Error:', error));

export default queue;
