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

  // Test image/png content type
  it('should handle image/png content type', async () => {
    // Minimal valid PNG (1x1 transparent pixel)
    const pngData = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
      0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
      0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
      0x42, 0x60, 0x82
    ]);

    const createRes = await request(app)
      .post('/v1/fragments')
      .set('Content-Type', 'image/png')
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD))
      .send(pngData);
    
    expect(createRes.status).toBe(201);
    const fragmentId = createRes.body.fragment.id;
    
    // Get the fragment
    const getRes = await request(app)
      .get(`/v1/fragments/${fragmentId}`)
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD));
    
    expect(getRes.status).toBe(200);
    expect(getRes.headers['content-type']).toContain('image/png');
  });

  // Test image/jpeg content type
  it('should handle image/jpeg content type', async () => {
    // Minimal valid JPEG
    const jpegData = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
      0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
      0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
      0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0A, 0x0C,
      0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
      0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D,
      0x1A, 0x1C, 0x1C, 0x20, 0x24, 0x2E, 0x27, 0x20,
      0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
      0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27,
      0x39, 0x3D, 0x38, 0x32, 0x3C, 0x2E, 0x33, 0x34,
      0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
      0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4,
      0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x03, 0xFF, 0xDA, 0x00, 0x08,
      0x01, 0x01, 0x00, 0x00, 0x3F, 0x00, 0x37, 0xFF,
      0xD9
    ]);

    const createRes = await request(app)
      .post('/v1/fragments')
      .set('Content-Type', 'image/jpeg')
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD))
      .send(jpegData);
    
    expect(createRes.status).toBe(201);
    const fragmentId = createRes.body.fragment.id;
    
    // Get the fragment
    const getRes = await request(app)
      .get(`/v1/fragments/${fragmentId}`)
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD));
    
    expect(getRes.status).toBe(200);
    expect(getRes.headers['content-type']).toContain('image/jpeg');
  });

  // Test image/webp content type
  it('should handle image/webp content type', async () => {
    // Minimal valid WebP
    const webpData = Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0x26, 0x00, 0x00, 0x00,
      0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20,
      0x1A, 0x00, 0x00, 0x00, 0x30, 0x01, 0x00, 0x9D,
      0x01, 0x2A, 0x01, 0x00, 0x01, 0x00, 0x00, 0x01,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ]);

    const createRes = await request(app)
      .post('/v1/fragments')
      .set('Content-Type', 'image/webp')
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD))
      .send(webpData);
    
    expect(createRes.status).toBe(201);
    const fragmentId = createRes.body.fragment.id;
    
    // Get the fragment
    const getRes = await request(app)
      .get(`/v1/fragments/${fragmentId}`)
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD));
    
    expect(getRes.status).toBe(200);
    expect(getRes.headers['content-type']).toContain('image/webp');
  });

  // Test image/gif content type
  it('should handle image/gif content type', async () => {
    // Minimal valid GIF
    const gifData = Buffer.from([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00,
      0x01, 0x00, 0x80, 0x00, 0x00, 0xFF, 0xFF, 0xFF,
      0x00, 0x00, 0x00, 0x21, 0xF9, 0x04, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x2C, 0x00, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
      0x01, 0x00, 0x3B
    ]);

    const createRes = await request(app)
      .post('/v1/fragments')
      .set('Content-Type', 'image/gif')
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD))
      .send(gifData);
    
    expect(createRes.status).toBe(201);
    const fragmentId = createRes.body.fragment.id;
    
    // Get the fragment
    const getRes = await request(app)
      .get(`/v1/fragments/${fragmentId}`)
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD));
    
    expect(getRes.status).toBe(200);
    expect(getRes.headers['content-type']).toContain('image/gif');
  });
});
