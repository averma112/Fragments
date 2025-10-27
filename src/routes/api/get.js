// src/routes/api/get.js


module.exports = (req, res) => {
  const { createSuccessResponse } = require('../../response');

res.status(200).json(createSuccessResponse({
  fragments: [],
}));
};
