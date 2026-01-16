import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import util from 'util';
import config from '../../config/index.js';

const mkdir = util.promisify(fs.mkdir);
const writeFile = util.promisify(fs.writeFile);
const unlink = util.promisify(fs.unlink);
const readFile = util.promisify(fs.readFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Interface for Storage Strategies
 */
class StorageStrategy {
    async save(buffer, filename, mimeType) { throw new Error('Not implemented'); }
    async get(filename) { throw new Error('Not implemented'); }
    async delete(filename) { throw new Error('Not implemented'); }
}

/**
 * Local File System Storage Strategy
 * Saves files to backend/uploads directory
 */
class LocalStorageStrategy extends StorageStrategy {
    constructor() {
        super();
        this.uploadDir = path.join(__dirname, '../../../uploads');
        this.ensureUploadDir();
    }

    async ensureUploadDir() {
        if (!fs.existsSync(this.uploadDir)) {
            await mkdir(this.uploadDir, { recursive: true });
        }
    }

    async save(buffer, filename, mimeType) {
        await this.ensureUploadDir();
        const filePath = path.join(this.uploadDir, filename);
        await writeFile(filePath, buffer);
        return {
            key: filename,
            url: filePath,
            provider: 'local'
        };
    }

    async get(filename) {
        const filePath = path.join(this.uploadDir, filename);
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filename}`);
        }
        return await readFile(filePath);
    }

    async delete(filename) {
        const filePath = path.join(this.uploadDir, filename);
        if (fs.existsSync(filePath)) {
            await unlink(filePath);
        }
    }
}

/**
 * S3 Storage Strategy (Stub for future use)
 */
class S3StorageStrategy extends StorageStrategy {
    constructor() {
        super();
        // Check for AWS SDK presence here if strictly implementing
        console.warn('S3StorageStrategy initialized but AWS SDK not installed yet.');
    }

    async save(buffer, filename, mimeType) {
        throw new Error('S3 Storage not yet implemented. Please install @aws-sdk/client-s3 and configure credentials.');
    }
}

class StorageService {
    constructor() {
        const type = process.env.STORAGE_TYPE || 'local';
        this.strategy = type === 's3' ? new S3StorageStrategy() : new LocalStorageStrategy();
        console.log(`Storage Service initialized with strategy: ${type}`);
    }

    /**
     * Save file to storage
     * @param {Buffer} buffer 
     * @param {string} filename 
     * @param {string} mimeType 
     * @returns {Promise<{key: string, url: string, provider: string}>}
     */
    async saveFile(buffer, filename, mimeType) {
        return this.strategy.save(buffer, filename, mimeType);
    }

    /**
     * Get file buffer from storage
     * @param {string} key 
     * @returns {Promise<Buffer>}
     */
    async getFile(key) {
        return this.strategy.get(key);
    }

    /**
     * Delete file from storage
     * @param {string} key 
     */
    async deleteFile(key) {
        return this.strategy.delete(key);
    }
}

export default new StorageService();
