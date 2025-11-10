const request = require('supertest');
const app = require('../../../src/app');
const { createBasicAuthHeader } = require('../../test-utils');

const TEST_USER = 'test@example.com';
const TEST_PASSWORD = 'password';

describe('Fragments API - Content Types', () => {
  // Test text/plain content type
  it('should handle text/plain content type', async () => {
    const textData = 'This is a plain text fragment';
    
    // Create a text fragment
    const createRes = await request(app)
      .post('/v1/fragments')
      .set('Content-Type', 'text/plain')
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD))
      .send(textData);
    
    expect(createRes.status).toBe(201);
    expect(createRes.body.status).toBe('ok');
    
    const fragmentId = createRes.body.fragment.id;
    
    // Get the fragment
    const getRes = await request(app)
      .get(`/v1/fragments/${fragmentId}`)
      .set('Accept', 'text/plain')
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD));
    
    expect(getRes.status).toBe(200);
    expect(getRes.headers['content-type']).toContain('text/plain');
    expect(getRes.text).toBe(textData);
  });

  // Test application/json content type
  it('should handle application/json content type', async () => {
    const jsonData = { key: 'value', number: 123, bool: true };
    
    // Create a JSON fragment
    const createRes = await request(app)
      .post('/v1/fragments')
      .set('Content-Type', 'application/json')
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD))
      .send(JSON.stringify(jsonData));
    
    expect(createRes.status).toBe(201);
    expect(createRes.body.status).toBe('ok');
    
    const fragmentId = createRes.body.fragment.id;
    
    // Get the fragment
    const getRes = await request(app)
      .get(`/v1/fragments/${fragmentId}`)
      .set('Accept', 'application/json')
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD));
    
    expect(getRes.status).toBe(200);
    expect(getRes.headers['content-type']).toContain('application/json');
    expect(JSON.parse(getRes.text)).toEqual(jsonData);
  });

  // Test unsupported content type
  it('should reject unsupported content type', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .set('Content-Type', 'application/octet-stream')
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD))
      .send(Buffer.from([0x01, 0x02, 0x03]));
    
    expect(res.status).toBe(415);
    expect(res.body.error.message).toContain('Unsupported Media Type');
  });
});
