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

  // Test Markdown to text conversion
  it('should convert Markdown to plain text', async () => {
    const markdown = '# Title\n\nBody text';
    const createRes = await request(app)
      .post('/v1/fragments')
      .set('Content-Type', 'text/markdown')
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD))
      .send(markdown);
    
    expect(createRes.status).toBe(201);
    const fragmentId = createRes.body.fragment.id;
    
    const txtRes = await request(app)
      .get(`/v1/fragments/${fragmentId}.txt`)
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD));
    
    expect(txtRes.status).toBe(200);
    expect(txtRes.headers['content-type']).toContain('text/plain');
  });

  // Test HTML to text conversion
  it('should convert HTML to plain text', async () => {
    const html = '<h1>Title</h1><p>Body text</p>';
    const createRes = await request(app)
      .post('/v1/fragments')
      .set('Content-Type', 'text/html')
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD))
      .send(html);
    
    expect(createRes.status).toBe(201);
    const fragmentId = createRes.body.fragment.id;
    
    const txtRes = await request(app)
      .get(`/v1/fragments/${fragmentId}.txt`)
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD));
    
    expect(txtRes.status).toBe(200);
    expect(txtRes.text).toContain('Title');
    expect(txtRes.text).toContain('Body text');
  });

  // Test CSV to JSON conversion
  it('should convert CSV to JSON', async () => {
    const csv = 'name,age\nJohn,30\nJane,25';
    const createRes = await request(app)
      .post('/v1/fragments')
      .set('Content-Type', 'text/csv')
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD))
      .send(csv);
    
    expect(createRes.status).toBe(201);
    const fragmentId = createRes.body.fragment.id;
    
    const jsonRes = await request(app)
      .get(`/v1/fragments/${fragmentId}.json`)
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD));
    
    expect(jsonRes.status).toBe(200);
    expect(jsonRes.headers['content-type']).toContain('application/json');
    const parsed = JSON.parse(jsonRes.text);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].name).toBe('John');
  });

  // Test JSON to YAML conversion
  it('should convert JSON to YAML', async () => {
    const json = JSON.stringify({ name: 'John', age: 30 });
    const createRes = await request(app)
      .post('/v1/fragments')
      .set('Content-Type', 'application/json')
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD))
      .send(json);
    
    expect(createRes.status).toBe(201);
    const fragmentId = createRes.body.fragment.id;
    
    const yamlRes = await request(app)
      .get(`/v1/fragments/${fragmentId}.yaml`)
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD));
    
    expect(yamlRes.status).toBe(200);
    expect(yamlRes.headers['content-type']).toContain('application/yaml');
    expect(yamlRes.text).toContain('name: John');
  });

  // Test JSON to text conversion
  it('should convert JSON to text', async () => {
    const json = JSON.stringify({ key: 'value' });
    const createRes = await request(app)
      .post('/v1/fragments')
      .set('Content-Type', 'application/json')
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD))
      .send(json);
    
    expect(createRes.status).toBe(201);
    const fragmentId = createRes.body.fragment.id;
    
    const txtRes = await request(app)
      .get(`/v1/fragments/${fragmentId}.txt`)
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD));
    
    expect(txtRes.status).toBe(200);
    expect(txtRes.text).toContain('key');
    expect(txtRes.text).toContain('value');
  });

  // Test markdown to markdown (no conversion)
  it('should return same markdown when converting to .md', async () => {
    const markdown = '# Test\n\nBody';
    const createRes = await request(app)
      .post('/v1/fragments')
      .set('Content-Type', 'text/markdown')
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD))
      .send(markdown);
    
    expect(createRes.status).toBe(201);
    const fragmentId = createRes.body.fragment.id;
    
    const mdRes = await request(app)
      .get(`/v1/fragments/${fragmentId}.md`)
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD));
    
    expect(mdRes.status).toBe(200);
    expect(mdRes.text).toBe(markdown);
  });

  // Test HTML to HTML (no conversion)
  it('should return same HTML when converting to .html', async () => {
    const html = '<h1>Test</h1>';
    const createRes = await request(app)
      .post('/v1/fragments')
      .set('Content-Type', 'text/html')
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD))
      .send(html);
    
    expect(createRes.status).toBe(201);
    const fragmentId = createRes.body.fragment.id;
    
    const htmlRes = await request(app)
      .get(`/v1/fragments/${fragmentId}.html`)
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD));
    
    expect(htmlRes.status).toBe(200);
    expect(htmlRes.text).toBe(html);
  });

  // Test text/plain to text/plain (no conversion)
  it('should return same text when converting to .txt', async () => {
    const text = 'Plain text';
    const createRes = await request(app)
      .post('/v1/fragments')
      .set('Content-Type', 'text/plain')
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD))
      .send(text);
    
    expect(createRes.status).toBe(201);
    const fragmentId = createRes.body.fragment.id;
    
    const txtRes = await request(app)
      .get(`/v1/fragments/${fragmentId}.txt`)
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD));
    
    expect(txtRes.status).toBe(200);
    expect(txtRes.text).toBe(text);
  });

  // Test CSV to text conversion
  it('should convert CSV to text', async () => {
    const csv = 'name,age\nJohn,30';
    const createRes = await request(app)
      .post('/v1/fragments')
      .set('Content-Type', 'text/csv')
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD))
      .send(csv);
    
    expect(createRes.status).toBe(201);
    const fragmentId = createRes.body.fragment.id;
    
    const txtRes = await request(app)
      .get(`/v1/fragments/${fragmentId}.txt`)
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD));
    
    expect(txtRes.status).toBe(200);
    expect(txtRes.text).toContain('name,age');
  });

  // Test CSV to CSV (no conversion)
  it('should return same CSV when converting to .csv', async () => {
    const csv = 'a,b\n1,2';
    const createRes = await request(app)
      .post('/v1/fragments')
      .set('Content-Type', 'text/csv')
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD))
      .send(csv);
    
    expect(createRes.status).toBe(201);
    const fragmentId = createRes.body.fragment.id;
    
    const csvRes = await request(app)
      .get(`/v1/fragments/${fragmentId}.csv`)
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD));
    
    expect(csvRes.status).toBe(200);
    expect(csvRes.text).toBe(csv);
  });

  // Test JSON to JSON (no conversion)
  it('should return same JSON when converting to .json', async () => {
    const json = JSON.stringify({ test: true });
    const createRes = await request(app)
      .post('/v1/fragments')
      .set('Content-Type', 'application/json')
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD))
      .send(json);
    
    expect(createRes.status).toBe(201);
    const fragmentId = createRes.body.fragment.id;
    
    const jsonRes = await request(app)
      .get(`/v1/fragments/${fragmentId}.json`)
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD));
    
    expect(jsonRes.status).toBe(200);
    expect(JSON.parse(jsonRes.text)).toEqual({ test: true });
  });

  // Test YAML to YAML (no conversion)
  it('should return same YAML when converting to .yaml', async () => {
    const yaml = 'name: test\nvalue: 123';
    const createRes = await request(app)
      .post('/v1/fragments')
      .set('Content-Type', 'application/yaml')
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD))
      .send(yaml);
    
    expect(createRes.status).toBe(201);
    const fragmentId = createRes.body.fragment.id;
    
    const yamlRes = await request(app)
      .get(`/v1/fragments/${fragmentId}.yaml`)
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD));
    
    expect(yamlRes.status).toBe(200);
    expect(yamlRes.text).toBe(yaml);
  });

  // Test YAML to YML
  it('should return same YAML when converting to .yml', async () => {
    const yaml = 'test: value';
    const createRes = await request(app)
      .post('/v1/fragments')
      .set('Content-Type', 'application/yaml')
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD))
      .send(yaml);
    
    expect(createRes.status).toBe(201);
    const fragmentId = createRes.body.fragment.id;
    
    const ymlRes = await request(app)
      .get(`/v1/fragments/${fragmentId}.yml`)
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD));
    
    expect(ymlRes.status).toBe(200);
    expect(ymlRes.text).toBe(yaml);
  });

  // Test YAML to text
  it('should convert YAML to text', async () => {
    const yaml = 'name: test';
    const createRes = await request(app)
      .post('/v1/fragments')
      .set('Content-Type', 'application/yaml')
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD))
      .send(yaml);
    
    expect(createRes.status).toBe(201);
    const fragmentId = createRes.body.fragment.id;
    
    const txtRes = await request(app)
      .get(`/v1/fragments/${fragmentId}.txt`)
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD));
    
    expect(txtRes.status).toBe(200);
    expect(txtRes.text).toBe(yaml);
  });

  // Test JSON to YML conversion
  it('should convert JSON to YML', async () => {
    const json = JSON.stringify({ name: 'test', value: 42 });
    const createRes = await request(app)
      .post('/v1/fragments')
      .set('Content-Type', 'application/json')
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD))
      .send(json);
    
    expect(createRes.status).toBe(201);
    const fragmentId = createRes.body.fragment.id;
    
    const ymlRes = await request(app)
      .get(`/v1/fragments/${fragmentId}.yml`)
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD));
    
    expect(ymlRes.status).toBe(200);
    expect(ymlRes.text).toContain('name: test');
  });

  // Test PNG to JPEG conversion
  it('should convert PNG to JPEG', async () => {
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
    
    const jpegRes = await request(app)
      .get(`/v1/fragments/${fragmentId}.jpg`)
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD));
    
    expect(jpegRes.status).toBe(200);
    expect(jpegRes.headers['content-type']).toContain('image/jpeg');
  });

  // Test PNG to WebP conversion
  it('should convert PNG to WebP', async () => {
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
    
    const webpRes = await request(app)
      .get(`/v1/fragments/${fragmentId}.webp`)
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD));
    
    expect(webpRes.status).toBe(200);
    expect(webpRes.headers['content-type']).toContain('image/webp');
  });

  // Test PNG to GIF conversion
  it('should convert PNG to GIF', async () => {
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
    
    const gifRes = await request(app)
      .get(`/v1/fragments/${fragmentId}.gif`)
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD));
    
    expect(gifRes.status).toBe(200);
    expect(gifRes.headers['content-type']).toContain('image/gif');
  });

  // Test PNG to PNG (no conversion)
  it('should return same PNG when converting to .png', async () => {
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
    
    const pngRes = await request(app)
      .get(`/v1/fragments/${fragmentId}.png`)
      .set('Authorization', createBasicAuthHeader(TEST_USER, TEST_PASSWORD));
    
    expect(pngRes.status).toBe(200);
    expect(pngRes.headers['content-type']).toContain('image/png');
  });
});
