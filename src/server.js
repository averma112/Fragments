// src/server.js

// We want to gracefully shutdown our server
const stoppable = require('stoppable');

// Get our logger instance
const logger = require('./logger');

const cors = require("cors")


// Get our express app instance
const app = require('./app');
app.use(cors({origin: "*"}))

// Get the desired port from the process' environment. Default to `8080`
const port = parseInt(process.env.PORT || '8080', 10);

// Start a server listening on this port
const server = stoppable(
  app.listen(port, () => {
    // Log a message that the server has started, and which port it's using.
    logger.info(`Server started on port ${port}`);

    if (process.env.LOG_LEVEL === 'debug') {
      // Use JSON.stringify to pretty print
      console.log('Current process.env:', JSON.stringify(process.env, null, 2));
    }
  })
  
  
);

// Export our server instance so other parts of our code can access it if necessary.
module.exports = server;
