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

  // Test GET /v1/fragments/:id/info
  it('should return fragment info', async () => {
    // First create a fragment
    const createRes = await request(app)
      .post('/v1/fragments')
      .set('Content-Type', 'text/plain')
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD))
      .send('test data');
    
    expect(createRes.status).toBe(201);
    const fragmentId = createRes.body.fragment.id;
    
    // Get fragment info
    const infoRes = await request(app)
      .get(`/v1/fragments/${fragmentId}/info`)
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD));
    
    expect(infoRes.status).toBe(200);
    expect(infoRes.body.fragment.id).toBe(fragmentId);
    expect(infoRes.body.fragment.type).toBe('text/plain');
  });

  // Test GET /v1/fragments/:id/info for non-existent fragment
  it('should return 404 for non-existent fragment info', async () => {
    const nonExistentId = '12345678-1234-5678-1234-567812345678';
    const res = await request(app)
      .get(`/v1/fragments/${nonExistentId}/info`)
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD));
    
    expect(res.status).toBe(404);
  });

  // Test PUT to update fragment
  it('should update fragment data', async () => {
    // Create a fragment
    const createRes = await request(app)
      .post('/v1/fragments')
      .set('Content-Type', 'text/plain')
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD))
      .send('original data');
    
    expect(createRes.status).toBe(201);
    const fragmentId = createRes.body.fragment.id;
    
    // Update the fragment
    const updateRes = await request(app)
      .put(`/v1/fragments/${fragmentId}`)
      .set('Content-Type', 'text/plain')
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD))
      .send('updated data');
    
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.fragment.id).toBe(fragmentId);
  });

  // Test PUT with different content type
  it('should return 400 when trying to change fragment type', async () => {
    // Create a text fragment
    const createRes = await request(app)
      .post('/v1/fragments')
      .set('Content-Type', 'text/plain')
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD))
      .send('text data');
    
    expect(createRes.status).toBe(201);
    const fragmentId = createRes.body.fragment.id;
    
    // Try to update with different type
    const updateRes = await request(app)
      .put(`/v1/fragments/${fragmentId}`)
      .set('Content-Type', 'application/json')
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD))
      .send('{"key": "value"}');
    
    expect(updateRes.status).toBe(400);
    expect(updateRes.body.error.message).toContain('Cannot change fragment type');
  });

  // Test DELETE fragment
  it('should delete a fragment', async () => {
    // Create a fragment
    const createRes = await request(app)
      .post('/v1/fragments')
      .set('Content-Type', 'text/plain')
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD))
      .send('test data');
    
    expect(createRes.status).toBe(201);
    const fragmentId = createRes.body.fragment.id;
    
    // Delete the fragment
    const deleteRes = await request(app)
      .delete(`/v1/fragments/${fragmentId}`)
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD));
    
    expect(deleteRes.status).toBe(200);
    
    // Verify it's deleted
    const getRes = await request(app)
      .get(`/v1/fragments/${fragmentId}`)
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD));
    
    expect(getRes.status).toBe(404);
  });

  // Test DELETE non-existent fragment
  it('should return 404 when deleting non-existent fragment', async () => {
    const nonExistentId = '12345678-1234-5678-1234-567812345678';
    const res = await request(app)
      .delete(`/v1/fragments/${nonExistentId}`)
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD));
    
    expect(res.status).toBe(404);
  });

  // Test GET /v1/fragments with expand=1
  it('should return expanded fragments list', async () => {
    // Create a fragment first
    await request(app)
      .post('/v1/fragments')
      .set('Content-Type', 'text/plain')
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD))
      .send('test data');
    
    const res = await request(app)
      .get('/v1/fragments?expand=1')
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD));
    
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.fragments)).toBe(true);
  });
});
