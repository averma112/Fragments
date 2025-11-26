const express = require('express');
const { ListObjectsV2Command } = require('@aws-sdk/client-s3');
const s3Client = require('../model/data/aws/s3Client');

const router = express.Router();

router.get('/v1/debug/s3', async (req, res) => {
  try {
    const bucket = process.env.AWS_S3_BUCKET_NAME;

    const cmd = new ListObjectsV2Command({
      Bucket: bucket,
      MaxKeys: 5
    });

    const response = await s3Client.send(cmd);

    res.json({
      status: 'ok',
      message: 'Backend can reach S3',
      bucket,
      objects: response.Contents || []
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Backend cannot reach S3',
      error: err.message,
      details: err
    });
  }
});

module.exports = router;
