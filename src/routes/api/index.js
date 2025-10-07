// src/routes/api/index.js

/**
 * The main entry-point for the v1 version of the fragments API.
 */
const express = require('express');

// Create a router on which to mount our API endpoints
const router = express.Router();

// Mount the fragments router to handle GET/POST/etc. at /v1/fragments
router.use('/fragments', require('./fragments'));

module.exports = router;
