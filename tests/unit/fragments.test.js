const request = require('supertest');
const { randomUUID } = require('crypto');

// Mock the Fragment model
const mockFragment = {
  id: 'test-id',
  ownerId: 'testUser',
  type: 'text/plain',
  size: 0,
  created: new Date().toISOString(),
  updated: new Date().toISOString(),
  save: jest.fn().mockResolvedValue(),
  getData: jest.fn().mockResolvedValue(Buffer.from('test data')),
  setData: jest.fn().mockImplementation(function(data) {
    this.size = data.length;
    return Promise.resolve();
  }),
  mimeType: 'text/plain',
  isText: true,
  formats: ['text/plain']
};

// Mock the Fragment model
jest.mock('../../src/model/fragment', () => {
  // Create a mock Fragment class
  class MockFragment {
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
  }

  return {
    __esModule: true,
    Fragment: MockFragment,
    convert: jest.fn().mockResolvedValue(Buffer.from('converted data'))
  };
});

// Import the Fragment model after setting up the mock
const { Fragment } = require('../../src/model/fragment');

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
    
    if (decoded === 'test@example.com:password' || decoded === 'user1@email.com:password1') {
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
      
      if (decoded === 'test@example.com:password' || decoded === 'user1@email.com:password1') {
        return { type: 'success', user: 'testUser' };
      }
    }
    
    res.setHeader('WWW-Authenticate', 'Basic realm="User Visible Realm"');
    return { type: 'fail', status: 401, message: 'Unauthorized' };
  },
}));

// Test user credentials - these must match the test credentials in src/auth/index.js
const TEST_USER = 'test@example.com';
const TEST_PASSWORD = 'password';

// Helper function to create Basic Auth header
const createAuthHeader = (email = TEST_USER, password = TEST_PASSWORD) => {
  const base64 = Buffer.from(`${email}:${password}`).toString('base64');
  return `Basic ${base64}`;
};

// Import app after all mocks are set up
const app = require('../../src/app');

describe('Fragments API', () => {
  let server;
  
  beforeAll(() => {
    // Start the server before tests
    server = app.listen(3000);
  });
  
  afterAll((done) => {
    // Close the server after tests
    server.close(done);
  });
  
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
  
  describe('POST /v1/fragments', () => {
    test('should create a new fragment', async () => {
      const testData = 'test data';
      
      const res = await request(server)
        .post('/v1/fragments')
        .set('Content-Type', 'text/plain')
        .set('Authorization', createAuthHeader('user1@email.com', 'password1'))
        .send(testData);
      
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('ok');
      expect(res.body.fragment).toMatchObject({
        id: expect.any(String),
        ownerId: 'testUser',
        type: 'text/plain',
        size: testData.length,
      });
      expect(res.headers['location']).toMatch(/\/v1\/fragments\//);
    });
    
    test('should return 415 for unsupported media type', async () => {
      Fragment.isSupportedType.mockReturnValueOnce(false);

      const res = await request(server)
        .post('/v1/fragments')
        .set('Content-Type', 'application/unsupported')
        .set('Authorization', createAuthHeader('user1@email.com', 'password1'))
        .send('test data');

      expect(res.status).toBe(415);
      expect(res.body.error.message).toBe('Unsupported Media Type');
    });
    
    test('should return 401 for unauthenticated requests', async () => {
      const res = await request(server)
        .post('/v1/fragments')
        .set('Content-Type', 'text/plain')
        .send('test data');
        
      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe('Unauthorized');
    });
  });
  
  describe('GET /v1/fragments', () => {
    test('should return all fragments for the authenticated user', async () => {
      const res = await request(server)
        .get('/v1/fragments')
        .set('Authorization', createAuthHeader('user1@email.com', 'password1'));
        
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(Array.isArray(res.body.fragments)).toBe(true);
      expect(Fragment.byUser).toHaveBeenCalledWith('testUser', false);
    });
    
    test('should return expanded fragments when expand=1', async () => {
      const res = await request(server)
        .get('/v1/fragments?expand=1')
        .set('Authorization', createAuthHeader('user1@email.com', 'password1'));
        
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(Array.isArray(res.body.fragments)).toBe(true);
      expect(Fragment.byUser).toHaveBeenCalledWith('testUser', true);
    });
    
    test('should return 401 for unauthenticated requests', async () => {
      const res = await request(server).get('/v1/fragments');
      expect(res.status).toBe(401);
    });
  });
  
  describe('GET /v1/fragments/:id', () => {
    test('should return fragment data', async () => {
      const testData = 'test data';
      const fragment = new Fragment({
        ...mockFragment,
        getData: jest.fn().mockResolvedValue(Buffer.from(testData))
      });
      Fragment.byId.mockResolvedValueOnce(fragment);
      
      const res = await request(server)
        .get(`/v1/fragments/${fragment.id}`)
        .set('Authorization', createAuthHeader('user1@email.com', 'password1'));
        
      expect(res.status).toBe(200);
      expect(res.text).toBe(testData);
      expect(res.headers['content-type']).toContain('text/plain');
      expect(Fragment.byId).toHaveBeenCalledWith('testUser', fragment.id);
    });
    
    test('should return 404 for non-existent fragment', async () => {
      Fragment.byId.mockRejectedValueOnce(new Error('Fragment not found'));
      
      const res = await request(server)
        .get('/v1/fragments/non-existent-id')
        .set('Authorization', createAuthHeader('user1@email.com', 'password1'));
        
      expect(res.status).toBe(404);
      expect(res.body.status).toBe('error');
      expect(res.body.error.message).toContain('not found');
    });
    
    test('should return 401 for unauthenticated requests', async () => {
      const res = await request(server).get('/v1/fragments/test-id');
      expect(res.status).toBe(401);
    });
  });
});
