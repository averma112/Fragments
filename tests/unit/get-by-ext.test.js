import request from 'supertest';
import app from '../../app.js';

// If you already have a helper for test JWTs, import it here instead
const TEST_TOKEN = 'test-token';

describe('GET /v1/fragments/:id.html', () => {
  it('converts a markdown fragment to HTML', async () => {
    // Create a markdown fragment
    const post = await request(app)
      .post('/v1/fragments')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .set('Content-Type', 'text/markdown')
      .send('# Hello World');

    expect(post.status).toBeGreaterThanOrEqual(200);
    expect(post.status).toBeLessThan(300);
    const id = post.body?.fragment?.id;
    expect(id).toBeDefined();

    // Convert to HTML
    const res = await request(app)
      .get(`/v1/fragments/${id}.html`)
      .set('Authorization', `Bearer ${TEST_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toMatch(/<h1>Hello World<\/h1>/);
  });

  it('returns 415 for unsupported conversion', async () => {
    const post = await request(app)
      .post('/v1/fragments')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .set('Content-Type', 'text/plain')
      .send('not markdown');

    const id = post.body?.fragment?.id;

    const res = await request(app)
      .get(`/v1/fragments/${id}.html`)
      .set('Authorization', `Bearer ${TEST_TOKEN}`);

    expect(res.status).toBe(415);
  });
});
