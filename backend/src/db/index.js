import pkg from 'pg';
const { Pool } = pkg;
import config from '../config/index.js';

const pool = new Pool({
    connectionString: config.database.url,
    max: 10, // Reduced from 20 to prevent MaxClientsInSessionMode error
    idleTimeoutMillis: 10000, // Close idle clients faster
    connectionTimeoutMillis: 5000,
    allowExitOnIdle: true
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

export const query = (text, params) => pool.query(text, params);

export const getClient = () => pool.connect();

export default pool;
