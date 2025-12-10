// src/server.js

const stoppable = require('stoppable');

const logger = require('./logger');

const cors = require("cors")


const app = require('./app');
app.use(cors({origin: "*"}))

const port = parseInt(process.env.PORT || '8080', 10);
// 🔹 ADD THIS BLOCK:
logger.info(
  {
    AWS_REGION: process.env.AWS_REGION,
    AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME,
  },
  'ECS startup env check'
);
const server = stoppable(
  app.listen(port, () => {
    logger.info(`Server started on port ${port}`);

    if (process.env.LOG_LEVEL === 'debug') {
      logger.debug({ env: process.env }, 'Current process environment');
    }
  })
  
  
);

module.exports = server;
