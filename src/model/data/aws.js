// src/model/data/aws.js
// AWS-backed data store implementing the same interface as the in-memory store.
// Required functions:
// - listFragments(ownerId, expand)
// - writeFragment(fragment)
// - readFragment(ownerId, id)
// - writeFragmentData(ownerId, id, buffer)
// - readFragmentData(ownerId, id)
// - deleteFragment(ownerId, id)

const {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');
const logger = require('../../logger');
const ddbDocClient = require('./aws/ddbDocClient');
const {
  PutCommand,
  GetCommand,
  QueryCommand,
  DeleteCommand,
} = require('@aws-sdk/lib-dynamodb');
const getS3Endpoint = () => {
  if (process.env.AWS_S3_ENDPOINT_URL) {
    logger.debug(
      { endpoint: process.env.AWS_S3_ENDPOINT_URL },
      'Using alternate S3 endpoint'
    );
    return process.env.AWS_S3_ENDPOINT_URL;
  }
};

const getS3Credentials = () => {
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    logger.debug('Using extra S3 credentials from env');
    return {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken: process.env.AWS_SESSION_TOKEN,
    };
  }
};

// ⚠️ This is the important part: endpoint + forcePathStyle for LocalStack
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  endpoint: getS3Endpoint(),
  forcePathStyle: !!process.env.AWS_S3_ENDPOINT_URL, // required for LocalStack
  credentials: getS3Credentials(),
});

const Bucket = process.env.AWS_S3_BUCKET_NAME;
const TableName = process.env.AWS_DYNAMODB_TABLE_NAME;

// ---------- S3 helpers for DATA only ----------

const dataKey = (ownerId, id) => `fragments/${ownerId}/${id}/data`;

// Stream GetObject body -> Buffer
async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

// ---------- DynamoDB: METADATA ----------

// Writes fragment metadata to DynamoDB. Returns the fragment object.
async function writeFragment(fragment) {
  const params = {
    TableName,
    Item: fragment,
  };

  const command = new PutCommand(params);

  try {
    await ddbDocClient.send(command);
    logger.debug({ fragment }, 'DynamoDB: wrote fragment metadata');
    return fragment;
  } catch (err) {
    logger.warn({ err, params, fragment }, 'error writing fragment to DynamoDB');
    throw err;
  }
}

// Reads fragment metadata from DynamoDB. Returns fragment | null
async function readFragment(ownerId, id) {
  const params = {
    TableName,
    Key: { ownerId, id },
  };

  const command = new GetCommand(params);

  try {
    const data = await ddbDocClient.send(command);
    const item = data?.Item;
    if (!item) {
      logger.debug({ ownerId, id }, 'DynamoDB: fragment metadata not found');
      return null;
    }
    return item;
  } catch (err) {
    logger.warn({ err, params }, 'error reading fragment from DynamoDB');
    throw err;
  }
}

// Get a list of fragments for a given user.
// If expand = false => returns [id, id, ...]
// If expand = true  => returns [fragmentObj, fragmentObj, ...]
async function listFragments(ownerId, expand = false) {
  const params = {
    TableName,
    KeyConditionExpression: 'ownerId = :ownerId',
    ExpressionAttributeValues: {
      ':ownerId': ownerId,
    },
  };

  if (!expand) {
    // Only return id attribute when not expanded
    params.ProjectionExpression = 'id';
  }

  const command = new QueryCommand(params);

  try {
    const data = await ddbDocClient.send(command);
    const items = data?.Items || [];

    return expand ? items : items.map((item) => item.id);
  } catch (err) {
    logger.error({ err, params }, 'error getting all fragments for user from DynamoDB');
    throw err;
  }
}

// ---------- S3: DATA (unchanged logic, just using dataKey) ----------

async function writeFragmentData(ownerId, id, buffer) {
  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket,
        Key: dataKey(ownerId, id),
        Body: buffer,
        ContentType: 'application/octet-stream',
      }),
    );
    logger.debug({ ownerId, id, size: buffer.length }, 'S3: wrote fragment data');
  } catch (err) {
    logger.error({ err, ownerId, id }, 'S3 writeFragmentData failed');
    throw err;
  }
}

async function readFragmentData(ownerId, id) {
  try {
    const resp = await s3Client.send(
      new GetObjectCommand({
        Bucket,
        Key: dataKey(ownerId, id),
      }),
    );
    const buf = await streamToBuffer(resp.Body);
    return buf;
  } catch (err) {
    if (
      err?.$metadata?.httpStatusCode === 404 ||
      err.name === 'NoSuchKey' ||
      err.Code === 'NoSuchKey'
    ) {
      logger.debug({ ownerId, id }, 'S3: fragment data not found');
      return null;
    }
    logger.error({ err, ownerId, id }, 'S3 readFragmentData failed');
    throw err;
  }
}

// Delete metadata from DynamoDB AND data from S3
async function deleteFragment(ownerId, id) {
  // 1) Delete metadata from DynamoDB
  const ddbParams = {
    TableName,
    Key: { ownerId, id },
  };
  const ddbCommand = new DeleteCommand(ddbParams);

  try {
    await ddbDocClient.send(ddbCommand);
    logger.debug({ ownerId, id }, 'DynamoDB: deleted fragment metadata');
  } catch (err) {
    logger.error({ err, ddbParams }, 'error deleting fragment metadata from DynamoDB');
    throw err;
  }

  // 2) Delete data from S3 (best-effort)
  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket,
        Key: dataKey(ownerId, id),
      }),
    );
    logger.debug({ ownerId, id }, 'S3: deleted fragment data');
  } catch (err) {
    logger.warn({ err, ownerId, id }, 'S3 deleteFragment data failed (continuing)');
    // Don't re-throw: metadata is already gone
  }
}

module.exports = {
  listFragments,
  writeFragment,
  readFragment,
  writeFragmentData,
  readFragmentData,
  deleteFragment,
};
