const { Readable } = require('stream');

// In-memory storage for fragments
const fragmentStore = new Map();

// Helper function to create a key for the store
function createKey(ownerId, id) {
  return `fragments/${ownerId}/${id}`;
}

// Helper function to ensure data is a Buffer
function ensureBuffer(data) {
  if (Buffer.isBuffer(data)) return data;
  if (typeof data === 'string') return Buffer.from(data);
  if (data instanceof Readable) {
    const chunks = [];
    return new Promise((resolve, reject) => {
      data.on('data', (chunk) => chunks.push(chunk));
      data.on('error', reject);
      data.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }
  return Buffer.from(JSON.stringify(data));
}

// In test environment, return a mock client
if (process.env.NODE_ENV === 'test') {
  // Create a simple mock client without requiring aws-sdk-client-mock
  const mockS3Client = {
    // Mock the getSignedUrl function
    getSignedUrl: async () => 'http://mock-signed-url.com',
    
    // Override the send method to handle our in-memory store
    send: async (command) => {
    const { input } = command;
    
    // Handle PutObjectCommand
    if (command.constructor.name === 'PutObjectCommand') {
      const key = input.Key;
      const body = await ensureBuffer(input.Body);
      
      fragmentStore.set(key, {
        ...input,
        Body: body,
        LastModified: new Date(),
        ContentLength: body.length
      });
      
      return { ETag: `"${Date.now()}"` };
    }
    
    // Handle GetObjectCommand
    if (command.constructor.name === 'GetObjectCommand') {
      const key = input.Key;
      const item = fragmentStore.get(key);
      
      if (!item) {
        const error = new Error('Not Found');
        error.name = 'NoSuchKey';
        throw error;
      }
      
      return {
        Body: Readable.from([item.Body]),
        ContentType: item.ContentType,
        LastModified: item.LastModified,
        ContentLength: item.Body.length
      };
    }
    
    // Handle DeleteObjectCommand
    if (command.constructor.name === 'DeleteObjectCommand') {
      const key = input.Key;
      fragmentStore.delete(key);
      return { DeleteMarker: true };
    }
    
    // Handle ListObjectsV2Command
    if (command.constructor.name === 'ListObjectsV2Command') {
      const prefix = input.Prefix || '';
      const contents = Array.from(fragmentStore.entries())
        .filter(([key]) => key.startsWith(prefix))
        .map(([key, value]) => ({
          Key: key,
          LastModified: value.LastModified,
          ETag: `"${Date.now()}"`,
          Size: value.Body ? value.Body.length : 0,
          StorageClass: 'STANDARD'
        }));
      
      return {
        Contents: contents,
        IsTruncated: false,
        KeyCount: contents.length,
        MaxKeys: 1000
      };
    }
    
      throw new Error(`Unsupported command: ${command.constructor.name}`);
    },
    
    // Add cleanup function
    cleanup: () => {
      fragmentStore.clear();
    }
  };
  
  module.exports = mockS3Client;
} else {
  // In non-test environments, return the real client
  const { S3Client } = require('@aws-sdk/client-s3');
  const clientConfig = {
    region: process.env.AWS_REGION || 'us-east-1',
  };

  // Configure credentials if provided, otherwise use default credential chain
  // (from ~/.aws/credentials, IAM roles, etc.)
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    clientConfig.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
    
    // Include session token if provided (for temporary credentials)
    if (process.env.AWS_SESSION_TOKEN) {
      clientConfig.credentials.sessionToken = process.env.AWS_SESSION_TOKEN;
    }
  }
  // If credentials are not provided, AWS SDK will use default credential chain
  // (IAM roles, ~/.aws/credentials, environment variables, etc.)
  
  // Use custom endpoint if provided (e.g., for LocalStack)
  if (process.env.AWS_S3_ENDPOINT_URL) {
    clientConfig.endpoint = process.env.AWS_S3_ENDPOINT_URL;
    clientConfig.forcePathStyle = true; // Required for LocalStack
  }

  module.exports = new S3Client(clientConfig);
}
