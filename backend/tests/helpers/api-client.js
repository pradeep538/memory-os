import request from 'supertest';

/**
 * Test API Client
 * Wraps supertest with auth and common patterns
 */
class TestApiClient {
    constructor(app, baseUrl = '/api/v1') {
        this.app = app;
        this.baseUrl = baseUrl;
        this.authToken = null;
    }

    /**
     * Set authentication token
     */
    setAuth(token) {
        this.authToken = token;
        return this;
    }

    /**
     * Clear authentication
     */
    clearAuth() {
        this.authToken = null;
        return this;
    }

    /**
     * GET request
     */
    async get(path, query = {}) {
        const req = request(this.app).get(`${this.baseUrl}${path}`);

        if (this.authToken) {
            req.set('Authorization', `Bearer ${this.authToken}`);
        }

        if (Object.keys(query).length > 0) {
            req.query(query);
        }

        return req;
    }

    /**
     * POST request
     */
    async post(path, body = {}) {
        const req = request(this.app)
            .post(`${this.baseUrl}${path}`)
            .send(body);

        if (this.authToken) {
            req.set('Authorization', `Bearer ${this.authToken}`);
        }

        return req;
    }

    /**
     * PATCH request
     */
    async patch(path, body = {}) {
        const req = request(this.app)
            .patch(`${this.baseUrl}${path}`)
            .send(body);

        if (this.authToken) {
            req.set('Authorization', `Bearer ${this.authToken}`);
        }

        return req;
    }

    /**
     * DELETE request
     */
    async delete(path) {
        const req = request(this.app).delete(`${this.baseUrl}${path}`);

        if (this.authToken) {
            req.set('Authorization', `Bearer ${this.authToken}`);
        }

        return req;
    }
}

/**
 * Response validation helpers
 */
export const expect = {
    success: (response) => {
        if (response.body.success !== true) {
            throw new Error(`Expected success response, got: ${JSON.stringify(response.body)}`);
        }
        return response.body;
    },

    error: (response, expectedCode) => {
        if (response.body.success !== false) {
            throw new Error(`Expected error response, got: ${JSON.stringify(response.body)}`);
        }
        if (expectedCode && response.body.code !== expectedCode) {
            throw new Error(`Expected error code ${expectedCode}, got: ${response.body.code}`);
        }
        return response.body;
    },

    status: (response, expectedStatus) => {
        if (response.status !== expectedStatus) {
            throw new Error(`Expected status ${expectedStatus}, got: ${response.status}`);
        }
        return response;
    },

    data: (response) => {
        if (!response.body.data) {
            throw new Error(`Expected data in response, got: ${JSON.stringify(response.body)}`);
        }
        return response.body.data;
    },
};

export default TestApiClient;
