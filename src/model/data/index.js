// src/model/data/index.js
const logger = require('../../logger');

let store;

// Decide based on env vars
// Use S3 only if both AWS_REGION and AWS_S3_BUCKET_NAME are set
// For local development without valid AWS credentials, unset AWS_S3_BUCKET_NAME to use in-memory store
const useS3 = process.env.AWS_REGION && process.env.AWS_S3_BUCKET_NAME;

if (useS3) {
  logger.info(
    {
      region: process.env.AWS_REGION,
      bucket: process.env.AWS_S3_BUCKET_NAME
    },
    'Using AWS S3 data store'
  );
  store = require('./aws');
} else {
  logger.info(
    {
      AWS_REGION: process.env.AWS_REGION,
      AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME,
      reason: !process.env.AWS_REGION || !process.env.AWS_S3_BUCKET_NAME 
        ? 'AWS_REGION or AWS_S3_BUCKET_NAME not set - using in-memory store' 
        : 'Using in-memory data store'
    },
    'Using in-memory data store'
  );
  store = require('./memory');
}

module.exports = store;
