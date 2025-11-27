// src/model/data/aws.js
// AWS S3-backed data store implementing the same interface as the in-memory store.
// Required functions:
// - listFragments(ownerId, expand)
// - writeFragment(fragment)
// - readFragment(ownerId, id)
// - writeFragmentData(ownerId, id, buffer)
// - readFragmentData(ownerId, id)
// - deleteFragment(ownerId, id)

const { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');
//const { fromIni } = require('@aws-sdk/credential-provider-ini');
const logger = require('../../logger');

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  //credentials: fromIni({ profile: 'default' })
});

const Bucket = process.env.AWS_S3_BUCKET_NAME;

// Use a stable S3 key layout consistent across all operations
const metadataKey = (ownerId, id) => `fragments/${ownerId}/${id}.json`;
const dataKey = (ownerId, id) => `fragments/${ownerId}/${id}/data`;
const ownerPrefix = (ownerId) => `fragments/${ownerId}/`;

// Helper to stream GetObject Body into a Buffer
async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function writeFragment(fragment) {
  const { ownerId, id } = fragment;
  const key = metadataKey(ownerId, id);
  const metadata = { ...fragment };
  delete metadata.data;

  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket,
        Key: key,
        Body: JSON.stringify(metadata),
        ContentType: 'application/json'
      })
    );
    logger.debug({ ownerId, id }, 'S3: wrote fragment metadata');
    return metadata;
  } catch (err) {
    logger.error({ err, ownerId, id }, 'S3 writeFragment failed');
    throw err;
  }
}

async function readFragment(ownerId, id) {
  const key = metadataKey(ownerId, id);
  try {
    const resp = await s3Client.send(new GetObjectCommand({ Bucket, Key: key }));
    const buf = await streamToBuffer(resp.Body);
    return JSON.parse(buf.toString('utf8'));
  } catch (err) {
    if (err?.$metadata?.httpStatusCode === 404 || err.name === 'NoSuchKey' || err.Code === 'NoSuchKey') {
      logger.debug({ ownerId, id }, 'S3: fragment metadata not found');
      return null;
    }
    logger.error({ err, ownerId, id }, 'S3 readFragment failed');
    throw err;
  }
}

async function writeFragmentData(ownerId, id, buffer) {
  try {
    await s3Client.send(
      new PutObjectCommand({ Bucket, Key: dataKey(ownerId, id), Body: buffer, ContentType: 'application/octet-stream' })
    );
    logger.debug({ ownerId, id, size: buffer.length }, 'S3: wrote fragment data');
  } catch (err) {
    logger.error({ err, ownerId, id }, 'S3 writeFragmentData failed');
    throw err;
  }
}

async function readFragmentData(ownerId, id) {
  try {
    const resp = await s3Client.send(new GetObjectCommand({ Bucket, Key: dataKey(ownerId, id) }));
    const buf = await streamToBuffer(resp.Body);
    return buf;
  } catch (err) {
    if (err?.$metadata?.httpStatusCode === 404 || err.name === 'NoSuchKey' || err.Code === 'NoSuchKey') {
      logger.debug({ ownerId, id }, 'S3: fragment data not found');
      return null;
    }
    logger.error({ err, ownerId, id }, 'S3 readFragmentData failed');
    throw err;
  }
}

async function listFragments(ownerId, expand = false) {
  const Prefix = ownerPrefix(ownerId);
  try {
    const result = await s3Client.send(new ListObjectsV2Command({ Bucket, Prefix }));
    const contents = result.Contents || [];

    // Only consider metadata files ending with .json
    const metaObjects = contents.filter((o) => o.Key.endsWith('.json'));
    const ids = metaObjects.map((o) => {
      const parts = o.Key.split('/');
      return parts[parts.length - 1].replace(/\.json$/, '');
    });

    if (!expand) return ids;

    // Fetch each metadata document
    const metas = [];
    for (const id of ids) {
      const meta = await readFragment(ownerId, id);
      if (meta) metas.push(meta);
    }
    return metas;
  } catch (err) {
    logger.error({ err, ownerId }, 'S3 listFragments failed');
    throw err;
  }
}

async function deleteFragment(ownerId, id) {
  try {
    await s3Client.send(new DeleteObjectCommand({ Bucket, Key: metadataKey(ownerId, id) }));
    await s3Client.send(new DeleteObjectCommand({ Bucket, Key: dataKey(ownerId, id) }));
    logger.debug({ ownerId, id }, 'S3: deleted fragment metadata and data');
  } catch (err) {
    logger.error({ err, ownerId, id }, 'S3 deleteFragment failed');
    throw err;
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
