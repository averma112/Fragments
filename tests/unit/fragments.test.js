const request = require('supertest');

// Mock the Fragment model: export a jest.fn constructor with static methods
const MockFragmentCtor = jest.fn();
MockFragmentCtor.byUser = jest.fn();
MockFragmentCtor.byId = jest.fn();
MockFragmentCtor.isSupportedType = jest.fn();

jest.mock('../../src/model/fragment', () => ({
  Fragment: MockFragmentCtor,
}));

// Import the Fragment model after setting up the mock
const { Fragment } = require('../../src/model/fragment');

// Mock Passport to set req.user as ownerId string 'testUser'
jest.mock('passport', () => ({
  use: jest.fn(),
  initialize: jest.fn().mockReturnValue((req, res, next) => next()),
  authenticate: jest.fn().mockImplementation(() => (req, res, next) => {
    req.user = 'testUser';
    return next();
  }),
}));

// Mock basic auth to assign req.user as 'testUser'
jest.mock('../../src/auth/basic-auth', () => ({
  strategy: jest.fn().mockImplementation(() => ({
    name: 'basic',
    authenticate: (req, res, next) => {
      req.user = 'testUser';
      return next();
    },
  })),
  authenticate: jest.fn().mockImplementation(() => (req, res, next) => {
    req.user = 'testUser';
    return next();
  }),
}));

// Import app after all mocks are set up
const app = require('../../src/app');

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
      // For unsupported content type, isSupportedType should return false
      Fragment.isSupportedType.mockReturnValue(false);

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
      Fragment.byId.mockResolvedValueOnce({
        id: 'test-id',
        ownerId: 'testUser',
        type: 'text/plain',
        getData: async () => testData,
      });
      
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
