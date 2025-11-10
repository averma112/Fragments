const request = require('supertest');
const app = require('../../../src/app');
const { createBasicAuthHeader } = require('../../test-utils');

describe('Auth Middleware - Edge Cases', () => {
  // Test with empty username
  it('should handle empty username in credentials', async () => {
    const base64 = Buffer.from(':password').toString('base64');
    const res = await request(app)
      .get('/v1/fragments')
      .set('Authorization', `Basic ${base64}`);
    
    expect(res.status).toBe(401);
    expect(res.body.error.message).toContain('Unauthorized');
  });

  // Test with empty password
  it('should handle empty password in credentials', async () => {
    const base64 = Buffer.from('test@example.com:').toString('base64');
    const res = await request(app)
      .get('/v1/fragments')
      .set('Authorization', `Basic ${base64}`);
    
    expect(res.status).toBe(401);
    expect(res.body.error.message).toContain('Unauthorized');
  });

  // Test with special characters in credentials
  it('should handle special characters in credentials', async () => {
    const base64 = Buffer.from('user!@#:$%^&*()').toString('base64');
    const res = await request(app)
      .get('/v1/fragments')
      .set('Authorization', `Basic ${base64}`);
    
    expect(res.status).toBe(401);
    expect(res.body.error.message).toContain('Unauthorized');
  });
});
