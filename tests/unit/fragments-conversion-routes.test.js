// tests/unit/fragments-conversion-routes.test.js
const request = require('supertest');

// Mock logger before requiring anything else
jest.mock('../../src/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
  child: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  })),
}));

const { Fragment } = require('../../src/model/fragment');

describe('Fragment Conversion and Advanced Routes', () => {
  // Set test user for all tests
  beforeAll(() => {
    process.env.NODE_ENV = 'test';
  });

  let app;
  
  beforeEach(() => {
    // Clear module cache and reload app for each test
    jest.clearAllMocks();
    delete require.cache[require.resolve('../../src/app')];
    app = require('../../src/app');
  });

  describe('GET /v1/fragments/:id.:ext - Conversion Routes', () => {
    test('converts markdown fragment to html', async () => {
      const fragment = new Fragment({
        ownerId: 'user1@email.com',
        type: 'text/markdown',
      });
      await fragment.setData(Buffer.from('# Hello World'));
      await fragment.save();

      const res = await request(app)
        .get(`/v1/fragments/${fragment.id}.html`)
        .auth('user1@email.com', 'password1');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/html');
      expect(res.text).toContain('<h1>Hello World</h1>');
    });

  test('converts csv fragment to json', async () => {
    const fragment = new Fragment({
      ownerId: 'user1@email.com',
      type: 'text/csv',
    });
    await fragment.setData(Buffer.from('name,age\nJohn,30\nJane,25'));
    await fragment.save();

    const res = await request(app)
      .get(`/v1/fragments/${fragment.id}.json`)
      .auth('user1@email.com', 'password1');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.body).toEqual([
      { name: 'John', age: '30' },
      { name: 'Jane', age: '25' }
    ]);
  });

  test('converts json fragment to yaml', async () => {
    const fragment = new Fragment({
      ownerId: 'user1@email.com',
      type: 'application/json',
    });
    await fragment.setData(Buffer.from('{"name":"John","age":30}'));
    await fragment.save();

    const res = await request(app)
      .get(`/v1/fragments/${fragment.id}.yaml`)
      .auth('user1@email.com', 'password1');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/yaml');
    expect(res.text).toContain('name: John');
    expect(res.text).toContain('age: 30');
  });

  test('returns 415 for unsupported conversion', async () => {
    const fragment = new Fragment({
      ownerId: 'user1@email.com',
      type: 'text/plain',
    });
    await fragment.setData(Buffer.from('Plain text'));
    await fragment.save();

    const res = await request(app)
      .get(`/v1/fragments/${fragment.id}.json`)
      .auth('user1@email.com', 'password1');

    expect(res.status).toBe(415);
    expect(res.body.status).toBe('error');
    expect(res.body.error.message).toContain('Unsupported conversion');
  });

  test('returns 404 for non-existent fragment', async () => {
    const res = await request(app)
      .get('/v1/fragments/non-existent-id.html')
      .auth('user1@email.com', 'password1');

    expect(res.status).toBe(404);
    expect(res.body.status).toBe('error');
  });

  test('returns same type when converting to same extension', async () => {
    const fragment = new Fragment({
      ownerId: 'user1@email.com',
      type: 'text/markdown',
    });
    await fragment.setData(Buffer.from('# Test'));
    await fragment.save();

    const res = await request(app)
      .get(`/v1/fragments/${fragment.id}.md`)
      .auth('user1@email.com', 'password1');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/markdown');
    expect(res.text).toBe('# Test');
  });
});

describe('PUT /v1/fragments/:id - Update Fragment', () => {
  test('successfully updates fragment data', async () => {
    const fragment = new Fragment({
      ownerId: 'user1@email.com',
      type: 'text/plain',
    });
    await fragment.setData(Buffer.from('Original data'));
    await fragment.save();

    const res = await request(app)
      .put(`/v1/fragments/${fragment.id}`)
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/plain')
      .send('Updated data');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.fragment.size).toBe(Buffer.from('Updated data').length);

    // Verify data was actually updated
    const updatedFragment = await Fragment.byId('user1@email.com', fragment.id);
    const data = await updatedFragment.getData();
    expect(data.toString()).toBe('Updated data');
  });

  test('rejects update with different content type', async () => {
    const fragment = new Fragment({
      ownerId: 'user1@email.com',
      type: 'text/plain',
    });
    await fragment.setData(Buffer.from('Original data'));
    await fragment.save();

    const res = await request(app)
      .put(`/v1/fragments/${fragment.id}`)
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'application/json')
      .send('{"key": "value"}');

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('Cannot change fragment type');
  });

  test('returns 404 for non-existent fragment', async () => {
    const res = await request(app)
      .put('/v1/fragments/non-existent-id')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/plain')
      .send('Some data');

    expect(res.status).toBe(404);
  });

  test('rejects update without content-type', async () => {
    const fragment = new Fragment({
      ownerId: 'user1@email.com',
      type: 'text/plain',
    });
    await fragment.setData(Buffer.from('Original'));
    await fragment.save();

    const res = await request(app)
      .put(`/v1/fragments/${fragment.id}`)
      .auth('user1@email.com', 'password1')
      .send('Updated data');

    expect(res.status).toBe(400);
  });

  test('rejects update with unsupported content-type', async () => {
    const fragment = new Fragment({
      ownerId: 'user1@email.com',
      type: 'text/plain',
    });
    await fragment.setData(Buffer.from('Original'));
    await fragment.save();

    const res = await request(app)
      .put(`/v1/fragments/${fragment.id}`)
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'application/pdf')
      .send('Data');

    expect(res.status).toBe(400);
  });

  test('allows content-type with charset parameter', async () => {
    const fragment = new Fragment({
      ownerId: 'user1@email.com',
      type: 'text/plain',
    });
    await fragment.setData(Buffer.from('Original'));
    await fragment.save();

    const res = await request(app)
      .put(`/v1/fragments/${fragment.id}`)
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/plain; charset=utf-8')
      .send('Updated');

    expect(res.status).toBe(200);
  });
});

describe('DELETE /v1/fragments/:id - Delete Fragment', () => {
  test('successfully deletes fragment', async () => {
    const fragment = new Fragment({
      ownerId: 'user1@email.com',
      type: 'text/plain',
    });
    await fragment.setData(Buffer.from('Test data'));
    await fragment.save();

    const res = await request(app)
      .delete(`/v1/fragments/${fragment.id}`)
      .auth('user1@email.com', 'password1');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');

    // Verify fragment is deleted
    await expect(
      Fragment.byId('user1@email.com', fragment.id)
    ).rejects.toThrow();
  });

  test('returns 404 when deleting non-existent fragment', async () => {
    const res = await request(app)
      .delete('/v1/fragments/non-existent-id')
      .auth('user1@email.com', 'password1');

    expect(res.status).toBe(404);
  });
});

describe('POST /v1/fragments - Location Header', () => {
  test('includes Location header with API_URL when set', async () => {
    process.env.API_URL = 'https://api.example.com';

    const res = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/plain')
      .send('Test fragment');

    expect(res.status).toBe(201);
    expect(res.headers.location).toMatch(/^https:\/\/api\.example\.com\/v1\/fragments\//);

    delete process.env.API_URL;
  });

  test('falls back to req.host when API_URL not set', async () => {
    delete process.env.API_URL;

    const res = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/plain')
      .send('Test fragment');

    expect(res.status).toBe(201);
    expect(res.headers.location).toBeDefined();
    expect(res.headers.location).toMatch(/\/v1\/fragments\//);
  });
});

  describe('GET /v1/fragments/:id/info - Fragment Metadata', () => {
    test('returns fragment metadata', async () => {
      // Create fragment via POST to ensure correct ownership
      const postRes = await request(app)
        .post('/v1/fragments')
        .auth('user1@email.com', 'password1')
        .set('Content-Type', 'text/plain')
        .send('Test data');

      expect(postRes.status).toBe(201);
      const fragmentId = postRes.body.fragment.id;

      const res = await request(app)
        .get(`/v1/fragments/${fragmentId}/info`)
        .auth('user1@email.com', 'password1');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.fragment.id).toBe(fragmentId);
      expect(res.body.fragment.type).toBe('text/plain');
      expect(res.body.fragment.size).toBe(9);
      expect(res.body.fragment).not.toHaveProperty('data');
    });

    test('returns 404 for non-existent fragment', async () => {
      const res = await request(app)
        .get('/v1/fragments/non-existent-id/info')
        .auth('user1@email.com', 'password1');

      expect(res.status).toBe(404);
    });
  });describe('GET /v1/fragments - List Fragments', () => {
  test('returns array of fragment ids when expand=0', async () => {
    // Create fragments via POST
    const post1 = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/plain')
      .send('Fragment 1');

    const post2 = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/markdown')
      .send('# Fragment 2');

    const fragment1Id = post1.body.fragment.id;
    const fragment2Id = post2.body.fragment.id;

    const res = await request(app)
      .get('/v1/fragments')
      .auth('user1@email.com', 'password1');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(Array.isArray(res.body.fragments)).toBe(true);
    expect(res.body.fragments).toContain(fragment1Id);
    expect(res.body.fragments).toContain(fragment2Id);
  });

  test('returns expanded fragment metadata when expand=1', async () => {
    // Create fragment via POST
    await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/plain')
      .send('Test');

    const res = await request(app)
      .get('/v1/fragments?expand=1')
      .auth('user1@email.com', 'password1');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(Array.isArray(res.body.fragments)).toBe(true);
    expect(res.body.fragments.length).toBeGreaterThan(0);
    expect(res.body.fragments[0]).toHaveProperty('id');
    expect(res.body.fragments[0]).toHaveProperty('type');
    expect(res.body.fragments[0]).toHaveProperty('size');
  });
  });
});
