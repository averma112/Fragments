const express = require('express');
const router = express.Router();
const rawBody = require('express').raw; 
const postHandler = require('./post');

router.post('/fragments', rawBody({
  inflate: true,
  limit: '5mb',
  type: (req) => {
    try {
      const { type } = require('content-type').parse(req);
      return require('../../model/fragment').Fragment.isSupportedType(type);
    } catch {
      return false;
    }
  },
}), postHandler);

module.exports = router;
