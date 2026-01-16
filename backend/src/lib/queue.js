
import { PgBoss } from 'pg-boss';
import dotenv from 'dotenv';
dotenv.config();

const queue = new PgBoss({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    application_name: 'memory-os-queue',
    // Connection Stability Settings
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    keepAlive: true,
    // Retention policy: keep 7 days of completed jobs, 7 days of failed jobs
    deleteAfterDays: 7,
    archiveCompletedAfterSeconds: 3600, // Archive (move to separate table) 1 hour after completion
    monitorStateIntervalSeconds: 60
});

// Log errors
queue.on('error', error => console.error('Queue Error:', error));

export default queue;
