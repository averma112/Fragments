// tests/unit/auth-middleware.test.js
const authMiddleware = require('../../src/auth/auth-middleware');
const passport = require('passport');
const hash = require('../../src/hash');

// Mock passport
jest.mock('passport');

// Mock logger
jest.mock('../../src/logger', () => ({
  warn: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
}));

describe('auth-middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { user: null };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('test environment', () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
      process.env.NODE_ENV = 'test';
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    test('allows pre-authenticated user in test mode', () => {
      req.user = 'test-user-hash';
      const middleware = authMiddleware('bearer');
      
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      expect(passport.authenticate).not.toHaveBeenCalled();
    });
  });

  describe('authentication success', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    test('hashes email and attaches to req.user on success', () => {
      const testEmail = 'user@example.com';
      const expectedHash = hash(testEmail);

      passport.authenticate.mockImplementation((strategy, options, callback) => {
        return (req, res, next) => {
          // Simulate successful authentication
          callback(null, testEmail, null);
        };
      });

      const middleware = authMiddleware('bearer');
      middleware(req, res, next);

      expect(req.user).toBe(expectedHash);
      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('works with http strategy', () => {
      const testEmail = 'admin@example.com';

      passport.authenticate.mockImplementation((strategy, options, callback) => {
        return (req, res, next) => {
          expect(strategy).toBe('http');
          callback(null, testEmail, null);
        };
      });

      const middleware = authMiddleware('http');
      middleware(req, res, next);

      expect(req.user).toBe(hash(testEmail));
      expect(next).toHaveBeenCalledWith();
    });

    test('works with bearer strategy', () => {
      const testEmail = 'user@test.com';

      passport.authenticate.mockImplementation((strategy, options, callback) => {
        return (req, res, next) => {
          expect(strategy).toBe('bearer');
          callback(null, testEmail, null);
        };
      });

      const middleware = authMiddleware('bearer');
      middleware(req, res, next);

      expect(req.user).toBe(hash(testEmail));
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('authentication failure', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    test('returns 401 when email is not provided', () => {
      passport.authenticate.mockImplementation((strategy, options, callback) => {
        return (req, res, next) => {
          // Simulate failed authentication (no email)
          callback(null, null, null);
        };
      });

      const middleware = authMiddleware('bearer');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        error: { message: 'Unauthorized', code: 401 }
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('returns 401 with custom message from info', () => {
      passport.authenticate.mockImplementation((strategy, options, callback) => {
        return (req, res, next) => {
          callback(null, null, { message: 'Invalid credentials' });
        };
      });

      const middleware = authMiddleware('bearer');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        error: { message: 'Invalid credentials', code: 401 }
      });
    });

    test('returns 500 on authentication error', () => {
      passport.authenticate.mockImplementation((strategy, options, callback) => {
        return (req, res, next) => {
          callback(new Error('Database connection failed'), null, null);
        };
      });

      const middleware = authMiddleware('bearer');
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          error: expect.objectContaining({
            code: 500,
            message: 'Unable to authenticate user'
          })
        })
      );
    });

    test('handles exceptions in passport.authenticate', () => {
      passport.authenticate.mockImplementation(() => {
        throw new Error('Passport configuration error');
      });

      const middleware = authMiddleware('bearer');
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          error: expect.objectContaining({
            code: 500,
            message: 'Authentication error'
          })
        })
      );
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    test('handles empty string email', () => {
      passport.authenticate.mockImplementation((strategy, options, callback) => {
        return (req, res, next) => {
          callback(null, '', null);
        };
      });

      const middleware = authMiddleware('bearer');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalled();
    });

    test('handles false email value', () => {
      passport.authenticate.mockImplementation((strategy, options, callback) => {
        return (req, res, next) => {
          callback(null, false, null);
        };
      });

      const middleware = authMiddleware('bearer');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });
});
