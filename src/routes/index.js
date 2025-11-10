// src/routes/index.js

const express = require('express');

const { version, author } = require('../../package.json');

const router = express.Router();
const { authenticate } = require('../auth');

router.use(`/v1`,authenticate() ,require('./api'));



const { createSuccessResponse } = require('../response');

router.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.status(200).json(createSuccessResponse({
    author,
    githubUrl: 'https://github.com/averma112/fragments', 
    version,                                             
  }));
});

module.exports = router;
