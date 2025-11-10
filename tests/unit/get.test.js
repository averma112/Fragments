// tests/unit/get.test.js

const request = require('supertest');
const { randomUUID } = require('crypto');

// Mock the Fragment model first
const mockFragment = {
  id: 'test-fragment-id',
  ownerId: 'test-user-id',
  type: 'text/plain',
  mimeType: 'text/plain',
  created: new Date().toISOString(),
  updated: new Date().toISOString(),
  size: 0,
  getData: jest.fn().mockResolvedValue(Buffer.from('test data')),
  setData: jest.fn().mockImplementation(function(data) {
    this.size = data.length;
    return Promise.resolve();
  }),
  save: jest.fn().mockImplementation(function() {
    return Promise.resolve(this);
  }),
  formats: ['text/plain', 'text/html']
};

// Mock the Fragment model
jest.mock('../../src/model/fragment', () => {
  return {
    __esModule: true,
    Fragment: class MockFragment {
      constructor(attributes) {
        Object.assign(this, { ...mockFragment, ...attributes });
      }
      
      static byId = jest.fn().mockResolvedValue(new MockFragment(mockFragment));
      static byUser = jest.fn().mockResolvedValue([new MockFragment(mockFragment)]);
      static delete = jest.fn().mockResolvedValue(true);
      static isSupportedType = jest.fn().mockImplementation((type) => {
        if (!type) return false;
        const baseType = type.split(';')[0].trim().toLowerCase();
        return ['text/plain', 'text/markdown', 'application/json'].includes(baseType);
      });
      
      static convert = jest.fn().mockResolvedValue(Buffer.from('converted data'));
    },
    convert: jest.fn().mockResolvedValue(Buffer.from('converted data'))
  };
});

// Import the Fragment model after setting up the mock
const { Fragment } = require('../../src/model/fragment');

// Mock the hash function
jest.mock('../../src/hash', () => (str) => {
  if (str === 'user1@email.com') return 'test-user-id';
  return 'test-user-id';
});

// Set NODE_ENV to 'test' to use the test authentication middleware
process.env.NODE_ENV = 'test';

// Mock the auth module to use the actual test authentication
const auth = require('../../src/auth');
const mockAuthenticate = jest.spyOn(auth, 'authenticate').mockImplementation(() => {
  return (req, res, next) => {
    const authHeader = req.headers && req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      res.setHeader('WWW-Authenticate', 'Basic realm="User Visible Realm"');
      return res.status(401).json({ status: 'error', error: { message: 'Unauthorized' } });
    }
    
    const base64 = authHeader.slice('Basic '.length);
    const decoded = Buffer.from(base64, 'base64').toString('utf8');
    
    if (decoded === 'test@example.com:password') {
      req.user = 'testUser';
      return next();
    }
    
    res.setHeader('WWW-Authenticate', 'Basic realm="User Visible Realm"');
    return res.status(401).json({ status: 'error', error: { message: 'Unauthorized' } });
  };
});

// Mock the strategy to avoid Passport errors
const mockStrategy = jest.spyOn(auth, 'strategy').mockImplementation(() => ({
  name: 'basic',
  authenticate: (req, res) => {
    const authHeader = req.headers && req.headers.authorization;
    if (authHeader && authHeader.startsWith('Basic ')) {
      const base64 = authHeader.slice('Basic '.length);
      const decoded = Buffer.from(base64, 'base64').toString('utf8');
      
      if (decoded === 'test@example.com:password') {
        return { type: 'success', user: 'testUser' };
      }
    }
    
    res.setHeader('WWW-Authenticate', 'Basic realm="User Visible Realm"');
    return { type: 'fail', status: 401, message: 'Unauthorized' };
  },
}));

// Import the app after all mocks are set up
const app = require('../../src/app');

// Helper function to create Basic Auth header
const createAuthHeader = (email, password) => {
  const base64 = Buffer.from(`${email}:${password}`).toString('base64');
  return `Basic ${base64}`;
};

// Test user credentials - these must match the test credentials in src/auth/index.js
const TEST_USER = 'test@example.com';
const TEST_PASSWORD = 'password';

describe('GET /v1/fragments', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Set up default mock implementations
    Fragment.byId.mockResolvedValue(new Fragment(mockFragment));
    Fragment.byUser.mockResolvedValue([new Fragment(mockFragment)]);
    Fragment.isSupportedType.mockImplementation((type) => {
      if (!type) return false;
      const baseType = type.split(';')[0].trim().toLowerCase();
      return ['text/plain', 'text/markdown', 'application/json'].includes(baseType);
    });
  });

  test('authenticated users get a fragments array', async () => {
    const res = await request(app)
      .get('/v1/fragments')
      .set('Authorization', createAuthHeader(TEST_USER, TEST_PASSWORD));
      
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(Array.isArray(res.body.fragments)).toBe(true);
  });

  test('unauthenticated requests are denied', async () => {
    const res = await request(app).get('/v1/fragments');
    expect(res.statusCode).toBe(401);
  });

  test('expanded fragments include full metadata', async () => {
    const res = await request(app)
      .get('/v1/fragments?expand=1')
      .set('Authorization', createAuthHeader(TEST_USER, TEST_PASSWORD));
      
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.fragments)).toBe(true);
    expect(res.body.fragments[0]).toHaveProperty('id');
    expect(res.body.fragments[0]).toHaveProperty('ownerId');
    expect(res.body.fragments[0]).toHaveProperty('type');
  });
});
