const request = require('supertest');
const app = require('../../src/app');

// ✅ EXACT same Basic auth header as your passing tests
const BASIC_AUTH = 'Basic dGVzdEBleGFtcGxlLmNvbTpwYXNzd29yZA==';

describe('Fragments core API', () => {
  it('POST /v1/fragments accepts text/plain', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .set('Authorization', BASIC_AUTH)
      .set('Content-Type', 'text/plain')
      .send('hello');

    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
    expect(res.headers.location).toBeDefined();
    expect(res.body?.fragment?.type).toMatch(/^text\/plain/);
  });

  it('POST /v1/fragments accepts application/json', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .set('Authorization', BASIC_AUTH)
      .set('Content-Type', 'application/json')
      .send({ a: 1 });

    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
    expect(res.body?.fragment?.type).toBe('application/json');
  });

  it('GET /v1/fragments?expand=1 returns expanded metadata', async () => {
    const res = await request(app)
      .get('/v1/fragments?expand=1')
      .set('Authorization', BASIC_AUTH);

    expect(res.status).toBe(200);
    expect(res.body?.fragments).toBeDefined();
    expect(Array.isArray(res.body.fragments)).toBe(true);
  });

  it('GET /v1/fragments/:id returns data with proper Content-Type', async () => {
    const post = await request(app)
      .post('/v1/fragments')
      .set('Authorization', BASIC_AUTH)
      .set('Content-Type', 'text/plain')
      .send('data');

    const id = post.body?.fragment?.id;
    expect(id).toBeDefined();

    const res = await request(app)
      .get(`/v1/fragments/${id}`)
      .set('Authorization', BASIC_AUTH);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
    expect(res.text).toBe('data');
  });

  it('GET /v1/fragments/:id/info returns metadata', async () => {
    const post = await request(app)
      .post('/v1/fragments')
      .set('Authorization', BASIC_AUTH)
      .set('Content-Type', 'text/plain')
      .send('meta');

    const id = post.body?.fragment?.id;
    expect(id).toBeDefined();

    const res = await request(app)
      .get(`/v1/fragments/${id}/info`)
      .set('Authorization', BASIC_AUTH);

    expect(res.status).toBe(200);
    expect(res.body?.fragment?.id).toBe(id);
  });
});
