const request = require('supertest');
const app = require('../../../src/app');
const { createBasicAuthHeader } = require('../../test-utils');

const TEST_USER = 'test@example.com';
const TEST_PASSWORD = 'password';

describe('Fragments API - Error Cases', () => {
  // Test invalid fragment ID format
  it('should return 404 for invalid fragment ID format', async () => {
    const res = await request(app)
      .get('/v1/fragments/invalid-id')
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD));
    
    expect(res.status).toBe(404);
    expect(res.body.error.message).toContain('not found');
  });

  // Test non-existent fragment
  it('should return 404 for non-existent fragment', async () => {
    const nonExistentId = '12345678-1234-5678-1234-567812345678';
    const res = await request(app)
      .get(`/v1/fragments/${nonExistentId}`)
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD));
    
    expect(res.status).toBe(404);
    expect(res.body.error.message).toContain('not found');
  });

  // Test invalid content type
  it('should return 415 for unsupported content type', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .set('Content-Type', 'invalid/type')
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD))
      .send('test data');
    
    expect(res.status).toBe(415);
    expect(res.body.error.message).toContain('Unsupported Media Type');
  });

  // Test missing content type
  it('should return 415 for missing content type', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD))
      .send('test data');
    
    expect(res.status).toBe(415);
    expect(res.body.error.message).toContain('Unsupported Media Type');
  });
});
