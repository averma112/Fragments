// src/model/data/index.js


// If the environment sets an AWS Region, we'll use AWS backend
// services (S3, DynamoDB); otherwise, we'll use an in-memory db.
module.exports = (process.env.AWS_REGION && process.env.AWS_S3_BUCKET_NAME)
  ? require('./aws')
  : require('./memory');