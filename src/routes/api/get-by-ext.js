import express from 'express';
import { Fragment } from '../../model/fragment.js';
import { authenticate } from '../../auth/middleware.js';
import { isValidConversion, convertFragment } from '../../model/conversions.js';

const router = express.Router();

/**
 * GET /v1/fragments/:id.ext
 * - Support all conversions (Assignment 3)
 */
router.get('/v1/fragments/:id.:ext', authenticate, async (req, res) => {
  try {
    const { id, ext } = req.params;
    const ownerId = req.user;

    const fragment = await Fragment.byId(ownerId, id);
    if (!fragment) {
      return res.status(404).json({ status: 'error', error: 'Fragment not found' });
    }

    const toExt = `.${ext}`;
    
    // Check if conversion is valid
    if (!isValidConversion(fragment.type, toExt)) {
      return res.status(415).json({ 
        status: 'error', 
        error: { message: 'Unsupported conversion' }
      });
    }

    // Get fragment data
    const data = await fragment.getData();
    
    // Convert the fragment
    const { data: convertedData, contentType } = await convertFragment(
      data, 
      fragment.type, 
      toExt
    );

    // Send converted data with appropriate content type
    res.set('Content-Type', contentType).status(200).send(convertedData);

  } catch (err) {
    console.error('Error in /v1/fragments/:id.ext:', err);
    res.status(500).json({ 
      status: 'error', 
      error: { message: err.message || 'Internal server error' }
    });
  }
});

export default router;
