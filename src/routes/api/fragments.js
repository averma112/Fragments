const express = require('express');
const { Fragment } = require('../../model/fragment');
const { createSuccessResponse, createErrorResponse } = require('../../response');
const log = require('../../logger');
const { isValidConversion, convertFragment } = require('../../model/conversions');

const router = express.Router();

// Raw body middleware - parse body for all requests so we can validate and return proper errors
const rawBody = () =>
  express.raw({
    inflate: true,
    limit: '5mb',
    // Always parse the body - we'll validate content type in the route handler
    type: '*/*',
  });

// List fragments (supports expand=1)
router.get('/', async (req, res) => {
  try {
    const expand = req.query.expand === '1';
    if (!req.user) return res.status(401).json(createErrorResponse(401, 'Unauthorized'));
const fragments = await Fragment.byUser(req.user, expand);

    res.status(200).json(createSuccessResponse({ fragments }));
  } catch (err) {
    log.error({ err }, 'Error getting fragments');
    res.status(500).json(createErrorResponse(500, err.message));
  }
});

// Return a fragment converted to a supported extension
router.get('/:id.:ext', async (req, res) => {
  try {
    const { id, ext } = req.params;
    const extWithDot = `.${ext}`;
    
    log.debug({ id, ext: extWithDot }, 'GET /:id.:ext request received');

    const fragment = await Fragment.byId(req.user, id);
    
    // Check if conversion is valid
    if (!isValidConversion(fragment.type, extWithDot)) {
      log.warn({ fromType: fragment.type, toExt: extWithDot }, 'Invalid conversion requested');
      return res.status(415).json(createErrorResponse(415, 'Unsupported conversion'));
    }

    const data = await fragment.getData();
    
    // Perform conversion
    const { data: convertedData, contentType } = await convertFragment(
      data,
      fragment.type,
      extWithDot
    );

    res.set('Content-Type', contentType);
    return res.status(200).send(convertedData);
  } catch (err) {
    log.error({ err }, 'Error converting fragment');
    if (err.message === 'Fragment not found') {
      res.status(404).json(createErrorResponse(404, 'Fragment not found'));
    } else if (err.message === 'Unsupported conversion') {
      res.status(415).json(createErrorResponse(415, 'Unsupported conversion'));
    } else {
      res.status(500).json(createErrorResponse(500, err.message));
    }
  }
});
router.get('/:id/info', async (req, res) => {
  try {
    const id = req.params.id;

    const fragment = await Fragment.byId(req.user, id);

    if (!fragment) {
      return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
    }

    // Clone fragment metadata and remove any data field if present
    const fragmentData = { ...fragment };
    delete fragmentData.data;

    return res.status(200).json(createSuccessResponse({ fragment: fragmentData }));
  } catch (err) {
    log.error({ err }, 'Error getting fragment metadata');
    if (err.message === 'Fragment not found') {
      return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
    }
    return res.status(500).json(createErrorResponse(500, err.message));
  }
});
// Fetch a fragment's original data by id
router.get('/:id', async (req, res) => {
  try {
    const fragment = await Fragment.byId(req.user, req.params.id);
if (!fragment) {
  return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
}
const data = await fragment.getData();

    res.set('Content-Type', fragment.type);

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

router.post('/', rawBody(), async (req, res) => {
  try {
    const ownerId = req.user;
    const typeHeader = req.headers['content-type'];

    log.debug({ ownerId, typeHeader, hasBody: !!req.body, bodyType: typeof req.body }, 'POST /fragments request received');

    if (!ownerId) {
      log.warn('POST /fragments: No ownerId (req.user is missing)');
      return res.status(401).json(createErrorResponse(401, 'Unauthorized'));
    }

    if (!typeHeader || !Fragment.isSupportedType(typeHeader)) {
      log.warn({ typeHeader }, 'POST /fragments: Unsupported content type');
      return res.status(415).json(createErrorResponse(415, 'Unsupported Media Type'));
    }

    const data = req.body;
    if (!Buffer.isBuffer(data)) {
      log.warn({ bodyType: typeof data, isBuffer: Buffer.isBuffer(data) }, 'POST /fragments: Request body is not a Buffer');
      return res.status(400).json(createErrorResponse(400, 'Request body must be raw data'));
    }

    log.debug({ ownerId, type: typeHeader, size: data.length }, 'Creating fragment');

    const fragment = new Fragment({
      ownerId,
      type: typeHeader,
      size: data.length,
    });

    log.debug({ fragmentId: fragment.id }, 'Fragment created, saving metadata');
    await fragment.save();
    
    log.debug({ fragmentId: fragment.id }, 'Saving fragment data');
    await fragment.setData(data);

    const location = `${process.env.API_URL || 'http://localhost:8080'}/v1/fragments/${fragment.id}`;
    res.set('Location', location);

    const fragmentData = { ...fragment };
    delete fragmentData.data;
    
    log.debug({ fragmentId: fragment.id }, 'Fragment created successfully');
    res.status(201).json(createSuccessResponse({ fragment: fragmentData }));
  } catch (err) {
    log.error({ err, stack: err.stack, message: err.message }, 'Error creating fragment');
    const errorMessage = err.message || 'Internal Server Error';
    res.status(500).json(createErrorResponse(500, errorMessage));
  }
});

// Update a fragment by id
router.put('/:id', rawBody(), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json(createErrorResponse(401, 'Unauthorized'));
    }

    const id = req.params.id;
    const typeHeader = req.headers['content-type'];

    log.debug({ ownerId: req.user, id, typeHeader }, 'PUT /fragments/:id request received');

    // Check if fragment exists
    const fragment = await Fragment.byId(req.user, id);
    if (!fragment) {
      return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
    }

    // Validate content type matches existing fragment type
    if (!typeHeader || !Fragment.isSupportedType(typeHeader)) {
      return res.status(400).json(createErrorResponse(400, 'Invalid Content-Type'));
    }

    // Check if content type matches the fragment's type (cannot change type)
    const newBaseType = typeHeader.split(';')[0].trim().toLowerCase();
    const existingBaseType = fragment.type.split(';')[0].trim().toLowerCase();
    
    if (newBaseType !== existingBaseType) {
      return res.status(400).json(createErrorResponse(400, 'Cannot change fragment type'));
    }

    // Validate request body
    const data = req.body;
    if (!Buffer.isBuffer(data)) {
      return res.status(400).json(createErrorResponse(400, 'Request body must be raw data'));
    }

    // Update the fragment data
    await fragment.setData(data);

    // Return updated fragment metadata
    const fragmentData = { ...fragment };
    delete fragmentData.data;

    log.debug({ fragmentId: fragment.id }, 'Fragment updated successfully');
    return res.status(200).json(createSuccessResponse({ fragment: fragmentData }));
  } catch (err) {
    log.error({ err }, 'Error updating fragment');
    if (err.message === 'Fragment not found') {
      return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
    }
    return res.status(500).json(createErrorResponse(500, err.message));
  }
});

// Delete a fragment by id
router.delete('/:id', async (req, res) => {
  try {
    // Make sure the user is authenticated
    if (!req.user) {
      return res.status(401).json(createErrorResponse(401, 'Unauthorized'));
    }

    const id = req.params.id;

    // Try to get the fragment for this user + id
    const fragment = await Fragment.byId(req.user, id);

    // If Fragment.byId returns null/undefined (depending on your implementation)
    if (!fragment) {
      return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
    }

    // Delete the fragment (this should remove metadata + data via your data layer)
    await fragment.delete();

    // Lab/spec expects 200 OK on successful delete
    return res.status(200).json(createSuccessResponse());
  } catch (err) {
    log.error({ err }, 'Error deleting fragment');
    if (err.message === 'Fragment not found') {
      return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
    }
    return res.status(500).json(createErrorResponse(500, err.message));
  }
});

module.exports = router;
