import express from 'express';
import MarkdownIt from 'markdown-it';
import { Fragment } from '../../model/fragment.js';
import { authenticate } from '../../auth/middleware.js';

const router = express.Router();
const md = new MarkdownIt();

/**
 * GET /v1/fragments/:id.ext
 * - Support Markdown -> HTML only (Assignment 2)
 */
router.get('/v1/fragments/:id.:ext', authenticate, async (req, res) => {
  try {
    const { id, ext } = req.params;
    const ownerId = req.user;

    const fragment = await Fragment.byId(ownerId, id);
    if (!fragment) {
      return res.status(404).json({ status: 'error', error: 'Fragment not found' });
    }

    if (ext === 'html') {
      if (!fragment.type.startsWith('text/markdown')) {
        return res.status(415).json({ status: 'error', error: 'Unsupported conversion' });
      }
      const data = await fragment.getData();
      const html = md.render(data.toString());
      res.set('Content-Type', 'text/html; charset=utf-8').status(200).send(html);
      return;
    }

    res.status(415).json({ status: 'error', error: 'Unsupported extension' });
  } catch (err) {
    console.error('Error in /v1/fragments/:id.ext:', err);
    res.status(500).json({ status: 'error', error: 'Internal server error' });
  }
});

export default router;
