const request = require('supertest');
const app = require('../../../src/app');
const { createBasicAuthHeader } = require('../../test-utils');

describe('Auth Middleware - Extended Tests', () => {
  // Test with different authentication scenarios
  const testCases = [
    {
      name: 'missing authorization header',
      authHeader: null,
      expectedStatus: 401,
      expectedMessage: 'Unauthorized'
    },
    {
      name: 'invalid authorization type',
      authHeader: 'Bearer token',
      expectedStatus: 401,
      expectedMessage: 'Unauthorized'
    },
    {
      name: 'malformed basic auth',
      authHeader: 'Basic malformed',
      expectedStatus: 401,
      expectedMessage: 'Unauthorized'
    },
    {
      name: 'invalid credentials format',
      authHeader: 'Basic ' + Buffer.from('not-a-valid-format').toString('base64'),
      expectedStatus: 401,
      expectedMessage: 'Unauthorized'
    },
    {
      name: 'non-existent user',
      authHeader: createBasicAuthHeader('nonexistent@example.com', 'password'),
      expectedStatus: 401,
      expectedMessage: 'Unauthorized'
    },
    {
      name: 'invalid password',
      authHeader: createBasicAuthHeader('test@example.com', 'wrong-password'),
      expectedStatus: 401,
      expectedMessage: 'Unauthorized'
    },
    {
      name: 'valid credentials',
      authHeader: createBasicAuthHeader('test@example.com', 'password'),
      expectedStatus: 200,
      expectedMessage: null
    }
  ];

  testCases.forEach(({ name, authHeader, expectedStatus, expectedMessage }) => {
    it(`should handle ${name}`, async () => {
      const req = request(app).get('/v1/fragments');
      
      if (authHeader) {
        req.set('Authorization', authHeader);
      }
      
      const res = await req;
      
      expect(res.status).toBe(expectedStatus);
      if (expectedMessage) {
        expect(res.body.error.message).toContain(expectedMessage);
      }
    });
  });
});
