const request = require('supertest');

// Mock the Fragment model with proper method implementations
const mockFragment = {
  id: 'test-id',
  ownerId: 'testUser',
  type: 'text/plain',
  size: 9,
  getData: jest.fn().mockResolvedValue(Buffer.from('test data')),
  setData: jest.fn().mockResolvedValue(undefined),
  save: jest.fn().mockResolvedValue(undefined),
  destroy: jest.fn().mockResolvedValue(undefined)
};

// Create a mock Fragment class
class MockFragment {
  static byUser = jest.fn().mockResolvedValue([mockFragment]);
  
  static byId = jest.fn().mockImplementation((ownerId, id) => {
    if (id === 'test-id') {
      return Promise.resolve({
        ...mockFragment,
        getData: jest.fn().mockResolvedValue(Buffer.from('test data')),
        ownerId: ownerId || 'testUser',
        id: 'test-id'
      });
    }
    const error = new Error('Fragment not found');
    error.status = 404;
    return Promise.reject(error);
  });
  
  static isSupportedType = jest.fn().mockReturnValue(true);
}

// Mock the Fragment model
jest.mock('../../src/model/fragment', () => ({
  __esModule: true,
  ...jest.requireActual('../../src/model/fragment'),
  default: MockFragment,
  ...MockFragment
}));

// Import the Fragment model after setting up the mock
const { Fragment } = require('../../src/model/fragment');

// Mock Passport
const mockUser = { id: 'testUser', email: 'test@example.com' };

jest.mock('passport', () => ({
  use: jest.fn(),
  initialize: jest.fn().mockReturnValue((req, res, next) => next()),
  authenticate: jest.fn().mockImplementation(() => (req, res, next) => {
    req.user = mockUser;
    return next();
  })
}));

// Mock basic auth
jest.mock('../../src/auth/basic-auth', () => ({
  strategy: jest.fn().mockImplementation(() => ({
    name: 'basic',
    authenticate: (req, res, next) => {
      req.user = mockUser;
      return next();
    }
  })),
  authenticate: jest.fn().mockImplementation(() => (req, res, next) => {
    req.user = mockUser;
    return next();
  })
}));

// Import app after all mocks are set up
const app = require('../../src/app');
const { Fragment } = require('../../src/model/fragment');

describe('Fragments API', () => {
  let server;
  
  beforeAll(() => {
    // Start the server before tests
    server = app.listen(3000);
  });
  
  afterAll(() => {
    // Close the server after tests
    server.close();
  });
  
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });
  
  describe('POST /v1/fragments', () => {
    test('should create a new fragment', async () => {
      const testData = Buffer.from('test data');
      const testFragment = {
        id: 'test-id',
        ownerId: 'testUser',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        type: 'text/plain',
        size: testData.length,
        getData: jest.fn().mockResolvedValue(testData),
        setData: jest.fn().mockResolvedValue(),
        save: jest.fn().mockResolvedValue()
      };
      
      // Mock the Fragment constructor to return our test fragment
      const mockFragmentInstance = testFragment;
      
      // Mock the static methods
      Fragment.mockImplementation(() => mockFragmentInstance);
      Fragment.isSupportedType = jest.fn().mockReturnValue(true);
      Fragment.byId = jest.fn().mockResolvedValue(mockFragmentInstance);
      
      const res = await request(server)
        .post('/v1/fragments')
        .set('Content-Type', 'text/plain')
        .send(testData);
      
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('ok');
      expect(res.body.fragment).toMatchObject({
        id: 'test-id',
        ownerId: 'testUser',
        type: 'text/plain',
        size: testData.length,
      });
      expect(res.headers['location']).toMatch(/\/v1\/fragments\/test-id/);
      
      // Verify the fragment was saved with the correct data
      expect(mockFragmentInstance.save).toHaveBeenCalled();
      expect(mockFragmentInstance.setData).toHaveBeenCalledWith(testData);
    });
    
    test('should return 415 for unsupported media type', async () => {
      // Mock the isSupportedType method to throw an error for unsupported types
      Fragment.isSupportedType = jest.fn().mockImplementation(() => {
        const error = new Error('Unsupported Media Type');
        error.status = 415;
        throw error;
      });
      
      const res = await request(server)
        .post('/v1/fragments')
        .set('Content-Type', 'application/unsupported')
        .send('test data');
      
      expect(res.status).toBe(415);
      expect(res.body.error.message).toBe('Unsupported Media Type');
    });
  });
  
  describe('GET /v1/fragments', () => {
    test('should return an empty array when no fragments exist', async () => {
      Fragment.byUser.mockResolvedValueOnce([]);
      
      const res = await request(server)
        .get('/v1/fragments')
        .auth('test@example.com', 'password');
      
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.fragments).toEqual([]);
    });
    
    test('should return a list of fragment IDs when expand=0', async () => {
      const testFragments = ['fragment1', 'fragment2'];
      Fragment.byUser.mockResolvedValueOnce(testFragments);
      
      const res = await request(server)
        .get('/v1/fragments?expand=0')
        .auth('test@example.com', 'password');
      
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.fragments).toEqual(testFragments);
      expect(Fragment.byUser).toHaveBeenCalledWith('testUser', false);
    });
    
    test('should return expanded fragments when expand=1', async () => {
      const testFragments = [{ id: '1' }, { id: '2' }];
      Fragment.byUser.mockResolvedValueOnce(testFragments);
      
      const res = await request(server)
        .get('/v1/fragments?expand=1')
        .auth('test@example.com', 'password');
      
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.fragments).toEqual(testFragments);
      expect(Fragment.byUser).toHaveBeenCalledWith('testUser', true);
    });
  });
  
  describe('GET /v1/fragments/:id', () => {
    test('should return fragment data', async () => {
      const testData = Buffer.from('test data');
      mockFragment.getData.mockResolvedValueOnce(testData);
      
      const res = await request(server)
        .get('/v1/fragments/test-id')
        .auth('test@example.com', 'password');
      
      expect(res.statusCode).toBe(200);
      expect(res.text).toBe(testData.toString());
      expect(res.headers['content-type']).toBe('text/plain; charset=utf-8');
      expect(Fragment.byId).toHaveBeenCalledWith('testUser', 'test-id');
    });
    
    test('should return 404 for non-existent fragment', async () => {
      Fragment.byId.mockRejectedValueOnce(new Error('Fragment not found'));
      
      const res = await request(server)
        .get('/v1/fragments/non-existent')
        .auth('test@example.com', 'password');
      
      expect(res.statusCode).toBe(404);
      expect(res.body.status).toBe('error');
      expect(res.body.error.message).toContain('not found');
    });
  });
});
