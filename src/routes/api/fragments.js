const express = require('express');
const { Fragment } = require('../../model/fragment');
const { createSuccessResponse, createErrorResponse } = require('../../response');
const log = require('../../logger');

const router = express.Router();
const MarkdownIt = require('markdown-it');
const md = new MarkdownIt();

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

// Return a fragment converted to a supported extension, e.g., Markdown to HTML
router.get('/:id.:ext', async (req, res) => {
  try {
    const { id, ext } = req.params;
    const fragment = await Fragment.byId(req.user, id);
    const data = await fragment.getData();

    // Only support Markdown (.md) to HTML (.html) for now
    if (ext === 'html' && fragment.mimeType === 'text/markdown') {
      const source = Buffer.isBuffer(data) ? data.toString('utf8') : String(data);
      const html = md.render(source);
      res.set('Content-Type', 'text/html');
      return res.status(200).send(html);
    }

    // Unsupported conversion requested
    return res
      .status(415)
      .json(createErrorResponse(415, 'Unsupported conversion requested'));
  } catch (err) {
    log.error({ err }, 'Error converting fragment');
    if (err.message === 'Fragment not found') {
      res.status(404).json(createErrorResponse(404, 'Fragment not found'));
    } else {
      res.status(500).json(createErrorResponse(500, err.message));
    }
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

    const fragmentData = { ...fragment };
    delete fragmentData.data;
    res.status(201).json(createSuccessResponse({ fragment: fragmentData }));
  } catch (err) {
    log.error({ err }, 'Error creating fragment');
    res.status(500).json(createErrorResponse(500, err.message));
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
