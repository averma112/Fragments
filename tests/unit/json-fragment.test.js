const request = require('supertest');
const app = require('../../src/app');

// Helper function to create Basic Auth header
const createAuthHeader = (email, password) => {
  const base64 = Buffer.from(`${email}:${password}`).toString('base64');
  return `Basic ${base64}`;
};

// Test user credentials
const TEST_USER = 'test@example.com';
const TEST_PASSWORD = 'password';

describe('JSON Fragment API', () => {
  const testData = { key: 'value' };
  let testFragmentId;

  beforeAll(() => {
    // Set NODE_ENV to 'test' to use the test authentication middleware
    process.env.NODE_ENV = 'test';
  });

  it('should create a new JSON fragment', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .set('Content-Type', 'application/json')
      .set('Authorization', createAuthHeader(TEST_USER, TEST_PASSWORD))
      .send(JSON.stringify(testData));

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('ok');
    expect(res.body.fragment).toBeDefined();
    expect(res.body.fragment.type).toBe('application/json');
    
    // Save the fragment ID for later tests
    testFragmentId = res.body.fragment.id;
  });

  it('should retrieve the created JSON fragment', async () => {
    if (!testFragmentId) {
      throw new Error('No fragment ID available. Make sure the create test runs first.');
    }

    const res = await request(app)
      .get(`/v1/fragments/${testFragmentId}`)
      .set('Authorization', createAuthHeader(TEST_USER, TEST_PASSWORD));

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    expect(JSON.parse(res.text)).toEqual(testData);
  });

  it('should list all fragments', async () => {
    const res = await request(app)
      .get('/v1/fragments')
      .set('Authorization', createAuthHeader(TEST_USER, TEST_PASSWORD));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.fragments)).toBe(true);
    expect(res.body.fragments.length).toBeGreaterThan(0);
  });

  it('should return 415 for invalid content type', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .set('Content-Type', 'invalid/type')
      .set('Authorization', createAuthHeader(TEST_USER, TEST_PASSWORD))
      .send(JSON.stringify(testData));

    expect(res.status).toBe(415);
    expect(res.body.error.message).toContain('Unsupported Media Type');
  });

  it('should return 401 for unauthenticated requests', async () => {
    const res = await request(app)
      .get('/v1/fragments')
      .set('Authorization', 'invalid-auth');

    expect(res.status).toBe(401);
  });
});
