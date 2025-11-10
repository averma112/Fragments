const request = require('supertest');
const app = require('../../../src/app');
const { createBasicAuthHeader } = require('../../test-utils');

describe('Auth Middleware', () => {
  // Test valid authentication
  it('should allow access with valid credentials', async () => {
    const res = await request(app)
      .get('/v1/fragments')
      .set('Authorization', createBasicAuthHeader('test@example.com', 'password'));
    
    expect(res.status).not.toBe(401);
  });

  // Test missing authorization header
  it('should return 401 for missing authorization header', async () => {
    const res = await request(app)
      .get('/v1/fragments');
    
    expect(res.status).toBe(401);
    expect(res.body.error.message).toContain('Unauthorized');
  });

  // Test invalid authorization header format
  it('should return 401 for invalid authorization header format', async () => {
    const res = await request(app)
      .get('/v1/fragments')
      .set('Authorization', 'InvalidFormat');
    
    expect(res.status).toBe(401);
    expect(res.body.error.message).toContain('Unauthorized');
  });

  // Test invalid credentials
  it('should return 401 for invalid credentials', async () => {
    const res = await request(app)
      .get('/v1/fragments')
      .set('Authorization', createBasicAuthHeader('invalid@example.com', 'wrongpassword'));
    
    expect(res.status).toBe(401);
    expect(res.body.error.message).toContain('Unauthorized');
  });
});
