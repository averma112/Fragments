// src/server.js

const stoppable = require('stoppable');

const logger = require('./logger');

const cors = require("cors")


const app = require('./app');
app.use(cors({origin: "*"}))

const port = parseInt(process.env.PORT || '8080', 10);

const server = stoppable(
  app.listen(port, () => {
    logger.info(`Server started on port ${port}`);

    if (process.env.LOG_LEVEL === 'debug') {
      console.log('Current process.env:', JSON.stringify(process.env, null, 2));
    }
  })
  
  
);

module.exports = server;
