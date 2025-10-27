const { Fragment } = require('../../model/fragment'); // your Fragment class

module.exports = async (req, res) => {
  try {
    if (!Buffer.isBuffer(req.body)) {
      return res.status(415).json({ error: 'Unsupported Content-Type' });
    }

    const ownerId = req.user?.email;
    if (!ownerId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const type = req.headers['content-type'];
    if (!Fragment.isSupportedType(type)) {
      return res.status(415).json({ error: `Unsupported Content-Type: ${type}` });
    }

    const fragment = new Fragment({ ownerId, type, size: req.body.length });
    await fragment.setData(req.body); 

    res.status(201).json({ fragment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
