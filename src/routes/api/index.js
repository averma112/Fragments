// src/routes/api/index.js


const express = require('express');

const router = express.Router();

router.use('/fragments', require('./fragments'));

module.exports = router;
