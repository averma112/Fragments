const request = require('supertest');
const app = require('../../../src/app');
const { createBasicAuthHeader } = require('../../test-utils');

const TEST_USER = 'test@example.com';
const TEST_PASSWORD = 'password';

describe('Fragments API - Conversion', () => {
  // Test Markdown to HTML conversion
  it('should convert Markdown to HTML', async () => {
    // Create a Markdown fragment
    const markdown = '# Hello World\n\nThis is a **test**.';
    const createRes = await request(app)
      .post('/v1/fragments')
      .set('Content-Type', 'text/markdown')
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD))
      .send(markdown);
    
    expect(createRes.status).toBe(201);
    const fragmentId = createRes.body.fragment.id;
    
    // Convert to HTML
    const htmlRes = await request(app)
      .get(`/v1/fragments/${fragmentId}.html`)
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD));
    
    expect(htmlRes.status).toBe(200);
    expect(htmlRes.headers['content-type']).toContain('text/html');
    expect(htmlRes.text).toContain('<h1>Hello World</h1>');
    expect(htmlRes.text).toContain('<strong>test</strong>');
  });

  // Test unsupported conversion
  it('should return 415 for unsupported conversion', async () => {
    // Create a text fragment
    const createRes = await request(app)
      .post('/v1/fragments')
      .set('Content-Type', 'text/plain')
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD))
      .send('test');
    
    expect(createRes.status).toBe(201);
    const fragmentId = createRes.body.fragment.id;
    
    // Try to convert to an unsupported format
    const res = await request(app)
      .get(`/v1/fragments/${fragmentId}.html`)
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD));
    
    expect(res.status).toBe(415);
    expect(res.body.error.message).toContain('Unsupported conversion');
  });

  // Test invalid extension
  it('should return 415 for invalid extension', async () => {
    // Create a text fragment
    const createRes = await request(app)
      .post('/v1/fragments')
      .set('Content-Type', 'text/plain')
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD))
      .send('test');
    
    expect(createRes.status).toBe(201);
    const fragmentId = createRes.body.fragment.id;
    
    // Try to convert to an invalid format
    const res = await request(app)
      .get(`/v1/fragments/${fragmentId}.invalid`)
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD));
    
    expect(res.status).toBe(415);
    expect(res.body.error.message).toContain('Unsupported conversion');
  });
});
