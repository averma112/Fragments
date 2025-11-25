const request = require('supertest');
const app = require('../../src/app');

// ✅ same Basic auth header
const BASIC_AUTH = 'Basic dGVzdEBleGFtcGxlLmNvbTpwYXNzd29yZA==';

describe('GET /v1/fragments/:id.html', () => {
  it('converts a markdown fragment to HTML', async () => {
    const post = await request(app)
      .post('/v1/fragments')
      .set('Authorization', BASIC_AUTH)
      .set('Content-Type', 'text/markdown')
      .send('# Hello World');

    expect(post.status).toBeGreaterThanOrEqual(200);
    expect(post.status).toBeLessThan(300);

    const id = post.body?.fragment?.id;
    expect(id).toBeDefined();

    const res = await request(app)
      .get(`/v1/fragments/${id}.html`)
      .set('Authorization', BASIC_AUTH);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toMatch(/<h1>Hello World<\/h1>/);
  });

  it('returns 415 for unsupported conversion', async () => {
    const post = await request(app)
      .post('/v1/fragments')
      .set('Authorization', BASIC_AUTH)
      .set('Content-Type', 'text/plain')
      .send('not markdown');

    const id = post.body?.fragment?.id;
    expect(id).toBeDefined();

    const res = await request(app)
      .get(`/v1/fragments/${id}.html`)
      .set('Authorization', BASIC_AUTH);

    expect(res.status).toBe(415);
  });
});
