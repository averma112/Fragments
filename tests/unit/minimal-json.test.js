const request = require('supertest');

// Test user credentials - these must match the test credentials in src/auth/index.js
const TEST_USER = 'test@example.com';
const TEST_PASSWORD = 'password';

// Helper function to create Basic Auth header
const createAuthHeader = (email, password) => {
  const auth = Buffer.from(`${email}:${password}`).toString('base64');
  return `Basic ${auth}`;
};

// Mock the data module first
jest.mock('../../src/model/data', () => ({
  writeFragment: jest.fn().mockResolvedValue(undefined),
  writeFragmentData: jest.fn().mockResolvedValue(undefined),
  readFragment: jest.fn().mockResolvedValue({
    id: 'test-fragment-id',
    ownerId: 'test-user-id',
    type: 'application/json',
    size: 0,
  }),
  readFragmentData: jest.fn().mockResolvedValue(Buffer.from(JSON.stringify({ key: 'test-value' }))),
  listFragments: jest.fn().mockResolvedValue([]),
  deleteFragment: jest.fn().mockResolvedValue(undefined),
}));

// Mock the Fragment model and other dependencies before importing app
const mockFragment = {
  id: 'test-fragment-id',
  ownerId: 'test-user-id',
  type: 'application/json',
  mimeType: 'application/json',
  created: new Date().toISOString(),
  updated: new Date().toISOString(),
  size: 0,
  getData: jest.fn().mockResolvedValue(Buffer.from(JSON.stringify({ key: 'test-value' }))),
  setData: jest.fn().mockImplementation(function(data) {
    this.size = data.length;
    this.updated = new Date().toISOString();
    return Promise.resolve();
  }),
  save: jest.fn().mockImplementation(function() {
    this.updated = new Date().toISOString();
    return Promise.resolve(this);
  }),
  formats: () => ['application/json', 'text/plain', 'text/html'],
};

// Mock the Fragment model methods
jest.mock('../../src/model/fragment', () => {
  const originalModule = jest.requireActual('../../src/model/fragment');
  
  // Create a mock instance that will be returned by the constructor
  const createMockFragment = (overrides = {}) => ({
    ...mockFragment,
    ...overrides,
  });
  
    // Create a mock instance for static methods
  const mockFragmentInstance = createMockFragment();
  
  return {
    __esModule: true,
    ...originalModule,
    byId: jest.fn().mockResolvedValue(mockFragmentInstance),
    byUser: jest.fn().mockResolvedValue([mockFragmentInstance]),
    delete: jest.fn().mockResolvedValue(undefined),
    isSupportedType: jest.fn().mockImplementation((type) => {
      if (!type) return false;
      const baseType = type.split(';')[0];
      return ['application/json', 'text/plain', 'text/markdown', 'text/html'].includes(baseType);
    }),
    Fragment: jest.fn().mockImplementation(({ id, ownerId, type, size } = {}) => {
      const fragment = createMockFragment({
        id: id || mockFragment.id,
        ownerId: ownerId || mockFragment.ownerId,
        type: type || mockFragment.type,
        size: size !== undefined ? size : mockFragment.size,
      });
      return fragment;
    }),
  };
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

// Import the Fragment model after mocking
const { Fragment } = require('../../src/model/fragment');

// Now import the app after setting up the mocks
const app = require('../../src/app');

// Create a mock fragment instance for testing
const mockFragmentInstance = new Fragment({
  id: 'test-fragment-id',
  ownerId: 'test-user-id',
  type: 'application/json',
  size: 0,
});

// Get a reference to the auth middleware for test setup
const authMiddleware = require('../../src/auth/auth-middleware');

describe('Minimal JSON Fragment Tests', () => {
  // This will store the created fragment ID for subsequent tests
  let fragmentId;
  
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a fresh mock fragment instance for each test
    const freshMockFragment = {
      ...mockFragment,
      getData: jest.fn().mockResolvedValue(Buffer.from(JSON.stringify({ key: 'test-value' }))),
      setData: jest.fn().mockImplementation(function(data) {
        this.size = data.length;
        return Promise.resolve();
      }),
      save: jest.fn().mockImplementation(function() {
        this.updated = new Date().toISOString();
        return Promise.resolve(this);
      })
    };
    
    // Reset the Fragment mocks with the fresh instance
    const { Fragment } = require('../../src/model/fragment');
    Fragment.byId = jest.fn().mockResolvedValue(freshMockFragment);
    Fragment.byUser = jest.fn().mockResolvedValue([freshMockFragment]);
    Fragment.isSupportedType = jest.fn().mockImplementation((type) => {
      if (!type) return false;
      const baseType = type.split(';')[0];
      return ['application/json', 'text/plain', 'text/markdown', 'text/html'].includes(baseType);
    });
    
    // Auth is already mocked at the top of the file
    // No need to reset it here
  });

  it('should create a JSON fragment', async () => {
    // Create a test fragment with a unique value
    const testValue = `test-${Date.now()}`;
    const testData = { key: testValue };
    const testDataString = JSON.stringify(testData);
    
    console.log(`Creating fragment with data: ${testDataString}`);
    
    const response = await request(app)
      .post('/v1/fragments')
      .set('Content-Type', 'application/json')
      .set('Authorization', createAuthHeader(TEST_USER, TEST_PASSWORD))
      .send(testDataString);

    console.log('Response status:', response.status);
    console.log('Response body:', JSON.stringify(response.body, null, 2));
    
    expect(response.status).toBe(201);
    expect(response.body.status).toBe('ok');
    expect(response.body.fragment).toBeDefined();
    
    // Save the fragment ID for subsequent tests
    fragmentId = response.body.fragment.id;
    console.log('Created fragment with ID:', fragmentId);
  });

  it('should retrieve the created JSON fragment', async () => {
    // Skip if no fragment was created in the previous test
    if (!fragmentId) return;

    const response = await request(app)
      .get(`/v1/fragments/${fragmentId}`)
      .set('Authorization', createAuthHeader(TEST_USER, TEST_PASSWORD));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ key: 'test-value' });
  });

  it('should list all fragments', async () => {
    const response = await request(app)
      .get('/v1/fragments')
      .set('Authorization', createAuthHeader(TEST_USER, TEST_PASSWORD));

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.fragments)).toBe(true);
  });
});
