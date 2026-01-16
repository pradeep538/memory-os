/**
 * Session Manager
 * Manages WebSocket connections and user contexts
 */
export class SessionManager {
    constructor() {
        this.sessions = new Map(); // userId -> ws connection
        this.contexts = new Map(); // userId -> conversation context
        this.pendingClarifications = new Map(); // sessionId -> clarification data
    }

    /**
     * Add a new session
     */
    addSession(userId, ws) {
        this.sessions.set(userId, ws);
        ws.userId = userId;

        console.log(`✅ Session added for user: ${userId}`);
    }

    /**
     * Get session by user ID
     */
    getSession(userId) {
        return this.sessions.get(userId);
    }

    /**
     * Remove session
     */
    removeSession(userId) {
        this.sessions.delete(userId);
        this.contexts.delete(userId);

        console.log(`❌ Session removed for user: ${userId}`);
    }

    /**
     * Get active session count
     */
    getActiveCount() {
        return this.sessions.size;
    }

    /**
     * Add message to user context (for conversation history)
     */
    addToContext(userId, message) {
        if (!this.contexts.has(userId)) {
            this.contexts.set(userId, []);
        }

        const context = this.contexts.get(userId);
        context.push({
            ...message,
            timestamp: new Date()
        });

        // Keep only last 10 messages
        if (context.length > 10) {
            context.shift();
        }
    }

    /**
     * Get user conversation context
     */
    getContext(userId) {
        return this.contexts.get(userId) || [];
    }

    /**
     * Get last user message
     */
    getLastMessage(userId) {
        const context = this.getContext(userId);
        return context.length > 0 ? context[context.length - 1] : null;
    }

    /**
     * Store pending clarification
     */
    storeClarification(sessionId, data) {
        this.pendingClarifications.set(sessionId, {
            ...data,
            expiresAt: Date.now() + (5 * 60 * 1000) // 5 minutes
        });
    }

    /**
     * Get pending clarification
     */
    getClarification(sessionId) {
        const clarification = this.pendingClarifications.get(sessionId);

        if (!clarification) return null;

        // Check if expired
        if (Date.now() > clarification.expiresAt) {
            this.pendingClarifications.delete(sessionId);
            return null;
        }

        return clarification;
    }

    /**
     * Remove clarification after processing
     */
    removeClarification(sessionId) {
        this.pendingClarifications.delete(sessionId);
    }

    /**
     * Cleanup expired clarifications (run periodically)
     */
    cleanupExpiredClarifications() {
        const now = Date.now();

        for (const [sessionId, data] of this.pendingClarifications.entries()) {
            if (now > data.expiresAt) {
                this.pendingClarifications.delete(sessionId);
            }
        }
    }

    /**
     * Send message to specific user
     */
    sendToUser(userId, message) {
        const ws = this.getSession(userId);

        if (ws) {
            ws.send(JSON.stringify(message));
            return true;
        }

        return false;
    }

    /**
     * Broadcast message to all connected users
     */
    broadcast(message) {
        let sent = 0;

        for (const [userId, ws] of this.sessions.entries()) {
            ws.send(JSON.stringify(message));
            sent++;
        }

        return sent;
    }
}

export const sessionManager = new SessionManager();

// Cleanup expired clarifications every minute
setInterval(() => {
    sessionManager.cleanupExpiredClarifications();
}, 60 * 1000);
