// src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const passport = require('passport');
const authenticate = require('./auth');

const logger = require('./logger');
const pino = require('pino-http')({ logger });

const app = express();

// --- CORS: echo origin (DO NOT use '*' with credentials) ---
const corsOptions = {
  origin: (origin, callback) => {
    // allow requests with no origin (e.g. curl, server-to-server)
    if (!origin) return callback(null, true);
    return callback(null, true); // echo origin back (allow all origins)
  },
  credentials: true,
  allowedHeaders: ['Authorization', 'Content-Type', 'Accept'],
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
};

// Apply CORS and preflight handler BEFORE routes
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // preflight responses

// Use compression and pino logging early
app.use(compression());
app.use(pino);

// Passport auth setup
passport.use(authenticate.strategy());
app.use(passport.initialize());

// Helmet (allow cross-origin resource policies compatible with CORS)
app.use(helmet({
  // some deployments may need special flags; disable crossOriginResourcePolicy if it blocks requests
  crossOriginResourcePolicy: false,
}));

// Mount routes (single mounting)
app.use('/', require('./routes'));

// 404 handler (still after CORS so responses include CORS headers)
app.use((req, res) => {
  const { createErrorResponse } = require('./response');
  res.status(404).json(createErrorResponse(404, 'not found'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'unable to process request';
  if (status > 499) {
    logger.error({ err }, 'Error processing request');
  }
  res.status(status).json({
    status: 'error',
    error: { message, code: status },
  });
});

module.exports = app;
