const request = require('supertest');
const express = require('express');
const router = require('../../src/routes/api/fragments');
const { Fragment } = require('../../src/model/fragment');

jest.mock('../../src/model/fragment');

describe('POST /fragments', () => {
  let app;

  beforeEach(() => {
    app = express();

    app.use((req, res, next) => {
      req.user = 'test-user-id';
      next();
    });

    app.use('/v1/fragments', router);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('returns 415 if content type is unsupported', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .set('Content-Type', 'application/msword')
      .send('test data');

    expect(res.status).toBe(415);
    expect(res.body.error).toEqual({
      code: 415,
      message: 'Unsupported Media Type',
    });
    expect(res.body.status).toBe('error');
  });

  it('creates a fragment if content type is supported', async () => {
    Fragment.prototype.save = jest.fn().mockResolvedValue();
    Fragment.prototype.setData = jest.fn().mockResolvedValue();

  Fragment.isSupportedType = jest.fn().mockReturnValue(true);
    const appWithUser = express();
    appWithUser.use((req, res, next) => {
      req.user = 'test@example.com';
      next();
    });
    appWithUser.use('/v1/fragments', router);

    const res = await request(appWithUser)
      .post('/v1/fragments')
      .set('Content-Type', 'text/plain')
      .send(Buffer.from('hello world')); // send as Buffer

    expect(res.status).toBe(201);
    expect(res.body.fragment).toBeDefined();
    expect(Fragment.prototype.setData).toHaveBeenCalledWith(Buffer.from('hello world'));
  });

  it('returns 401 if user not set', async () => {
    const appNoUser = express();
    appNoUser.use('/v1/fragments', router);

    const res = await request(appNoUser)
      .post('/v1/fragments')
      .set('Content-Type', 'text/plain')
      .send('hello');

    expect(res.status).toBe(401);
    expect(res.body.error).toEqual({
      code: 401,
      message: 'Unauthorized',
    });
    expect(res.body.status).toBe('error');
  });
});
