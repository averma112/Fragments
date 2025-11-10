const request = require('supertest');
const app = require('../../../src/app');
const { createBasicAuthHeader, wait } = require('../../test-utils');

const TEST_USER = 'test@example.com';
const TEST_PASSWORD = 'password';

describe('Fragments API Extended Tests', () => {
  let fragmentId;
  const testData = { key: 'test-value' };

  // Create a fragment before running tests
  beforeAll(async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .set('Content-Type', 'application/json')
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD))
      .send(JSON.stringify(testData));
    
    fragmentId = res.body.fragment.id;
  });

  // Test getting fragment by ID
  it('should get fragment by ID', async () => {
    const res = await request(app)
      .get(`/v1/fragments/${fragmentId}`)
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD));
    
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    expect(JSON.parse(res.text)).toEqual(testData);
  });

  // Test creating a fragment with invalid content type
  it('should return 415 for invalid content type', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .set('Content-Type', 'invalid/type')
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD))
      .send('test data');
    
    expect(res.status).toBe(415);
    expect(res.body.error.message).toContain('Unsupported Media Type');
  });

  // Test getting a non-existent fragment
  it('should return 404 for non-existent fragment', async () => {
    const nonExistentId = 'non-existent-id';
    const res = await request(app)
      .get(`/v1/fragments/${nonExistentId}`)
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD));
    
    expect(res.status).toBe(404);
    expect(res.body.error.message).toContain('not found');
  });

  // Test getting all fragments for a user
  it('should list all fragments for a user', async () => {
    const res = await request(app)
      .get('/v1/fragments')
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD));
    
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.fragments)).toBe(true);
    expect(res.body.fragments.length).toBeGreaterThan(0);
  });
});
