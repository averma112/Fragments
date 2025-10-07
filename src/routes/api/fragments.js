const express = require('express');
const { Fragment } = require('../../model/fragment');
const { createSuccessResponse, createErrorResponse } = require('../../response');
const log = require('../../logger');

// Create a router that we can use to mount our API
const router = express.Router();

// Support sending various Content-Types on the body up to 5MB in size
const rawBody = () =>
  express.raw({
    inflate: true,
    limit: '5mb',
    type: (req) => {
  const typeHeader = req.headers['content-type'];
  if (!typeHeader) return false;
  try {
    return Fragment.isSupportedType(typeHeader);
  } catch {
    return false;
  }
},
  });


/**
 * POST /fragments - Create a new fragment
 */
router.post('/', rawBody(), async (req, res) => {
  try {
    const ownerId = req.user; // Set by auth middleware
    const typeHeader = req.headers['content-type'];

    if (!ownerId) {
      return res.status(401).json(createErrorResponse(401, 'Unauthorized'));
    }

    if (!typeHeader || !Fragment.isSupportedType(typeHeader)) {
      return res.status(415).json(createErrorResponse(415, 'Unsupported Media Type'));
    }

    const data = req.body;
    if (!Buffer.isBuffer(data)) {
      return res.status(400).json(createErrorResponse(400, 'Request body must be raw data'));
    }

    const fragment = new Fragment({
      ownerId,
      type: typeHeader,
      size: data.length,
    });

    await fragment.save();
    await fragment.setData(data);

    res.set('Location', `${process.env.API_URL}/v1/fragments/${fragment.id}`);

    const { data: _, ...fragmentData } = fragment;
    res.status(201).json(createSuccessResponse({ fragment: fragmentData }));
  } catch (err) {
    log.error({ err }, 'Error creating fragment');
    res.status(500).json(createErrorResponse(500, err.message));
  }
});

/**
 * GET /fragments - Get all fragments for the current user
 */
router.get('/', async (req, res) => {
  try {
    const expand = req.query.expand === '1';
    const fragments = await Fragment.byUser(req.user, expand);
    res.status(200).json(createSuccessResponse({ fragments }));
  } catch (err) {
    log.error({ err }, 'Error getting fragments');
    res.status(500).json(createErrorResponse(500, err.message));
  }
});

/**
 * GET /fragments/:id - Get a fragment by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const fragment = await Fragment.byId(req.user, req.params.id);
    const data = await fragment.getData();

    // Set the Content-Type header
    res.set('Content-Type', fragment.type);

    // Send the raw data
    res.status(200).send(data);
  } catch (err) {
    log.error({ err }, 'Error getting fragment');
    if (err.message === 'Fragment not found') {
      res.status(404).json(createErrorResponse(404, 'Fragment not found'));
    } else {
      res.status(500).json(createErrorResponse(500, err.message));
    }
  }
});

module.exports = router;
