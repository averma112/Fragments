// src/model/data/index.js
const logger = require('../../logger');

let store;

// Decide based on env vars
if (process.env.AWS_REGION && process.env.AWS_S3_BUCKET_NAME) {
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
      AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME
    },
    'Using in-memory data store'
  );
  store = require('./memory');
}

module.exports = store;
