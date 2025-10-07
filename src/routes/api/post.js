const { Fragment } = require('../../model/fragment'); // your Fragment class

module.exports = async (req, res) => {
  try {
    // Check if body is a Buffer
    if (!Buffer.isBuffer(req.body)) {
      return res.status(415).json({ error: 'Unsupported Content-Type' });
    }

    const ownerId = req.user?.email; // assuming req.user exists and has email
    if (!ownerId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const type = req.headers['content-type'];
    if (!Fragment.isSupportedType(type)) {
      return res.status(415).json({ error: `Unsupported Content-Type: ${type}` });
    }

    // Create fragment metadata and save data
    const fragment = new Fragment({ ownerId, type, size: req.body.length });
    await fragment.setData(req.body); // sets size and saves metadata too

    res.status(201).json({ fragment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
