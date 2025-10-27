const request = require('supertest');
const express = require('express');

// Use the actual router under test
const router = require('../../src/routes/api/fragments');

// Mock Fragment model methods used by the router for these tests
jest.mock('../../src/model/fragment', () => ({
  Fragment: {
    byId: jest.fn(),
  },
}));

const { Fragment } = require('../../src/model/fragment');

describe('GET /v1/fragments/:id.ext conversion', () => {
  let app;

  beforeEach(() => {
    app = express();
    // Fake auth to set req.user like other tests
    app.use((req, res, next) => {
      req.user = 'test-user-id';
      next();
    });
    app.use('/v1/fragments', router);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('converts Markdown fragment to HTML with .html extension', async () => {
    // Mock a markdown fragment
    Fragment.byId.mockResolvedValue({
      mimeType: 'text/markdown',
      getData: async () => Buffer.from('# Title\n\nhello world'),
    });

    const res = await request(app).get('/v1/fragments/abc123.html');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/^text\/html/);
    expect(res.text).toContain('<h1>Title</h1>');
    expect(res.text).toContain('<p>hello world</p>');
  });

  test('returns 415 for unsupported conversion when fragment is not markdown', async () => {
    // Mock a plain text fragment
    Fragment.byId.mockResolvedValue({
      mimeType: 'text/plain',
      getData: async () => Buffer.from('just text'),
    });

    const res = await request(app).get('/v1/fragments/def456.html');

    expect(res.status).toBe(415);
    expect(res.body).toEqual({
      status: 'error',
      error: { code: 415, message: 'Unsupported conversion requested' },
    });
  });
});
