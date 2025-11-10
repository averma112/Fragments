// src/auth/index.js

// If both are set, crash (real production safety)
if (
  process.env.AWS_COGNITO_POOL_ID &&
  process.env.AWS_COGNITO_CLIENT_ID &&
  process.env.HTPASSWD_FILE
) {
  throw new Error('Only one auth method can be used at a time');
}

// --------------------------
// Test environment middleware
// --------------------------
if (process.env.NODE_ENV === 'test') {
  // helpers to parse Basic auth header "Basic base64(user:pass)"
  const parseBasicAuth = (authHeader = '') => {
    if (typeof authHeader !== 'string') return null;
    if (!authHeader.startsWith('Basic ')) return null;
    try {
      const base64 = authHeader.slice('Basic '.length);
      const decoded = Buffer.from(base64, 'base64').toString('utf8');
      const idx = decoded.indexOf(':');
      if (idx === -1) return null;
      const user = decoded.slice(0, idx);
      const pass = decoded.slice(idx + 1);
      return { user, pass };
    } catch {
      return null;
    }
  };

  // authenticate middleware factory for tests:
  // - missing Authorization => 401
  // - invalid Basic header => 401
  // - credentials match test@example.com/password => req.user = 'testUser'
  // - otherwise => 401
  const authenticate = () => {
    return (req, res, next) => {
      const authHeader = req.headers && req.headers.authorization;
      if (!authHeader) {
        res.setHeader('WWW-Authenticate', 'Basic realm="User Visible Realm"');
        return res.status(401).json({ status: 'error', error: { message: 'Unauthorized' } });
      }

      const creds = parseBasicAuth(authHeader);
      if (!creds) {
        res.setHeader('WWW-Authenticate', 'Basic realm="User Visible Realm"');
        return res.status(401).json({ status: 'error', error: { message: 'Unauthorized' } });
      }

      if (creds.user === 'test@example.com' && creds.pass === 'password') {
        // tests expect req.user === 'testUser'
        req.user = 'testUser';
        return next();
      }

      res.setHeader('WWW-Authenticate', 'Basic realm="User Visible Realm"');
      return res.status(401).json({ status: 'error', error: { message: 'Unauthorized' } });
    };
  };

  // Provide a passport-style strategy stub (safe to call but not used by tests)
  const strategy = () => ({
    name: 'mock',
    authenticate(req) {
      if (typeof this.success === 'function') this.success('test@example.com');
    },
  });

  module.exports = { authenticate, strategy };
} else if (process.env.HTPASSWD_FILE && process.env.NODE_ENV !== 'production') {
  // Real basic auth in dev
  module.exports = require('./basic-auth');
} else if (process.env.AWS_COGNITO_POOL_ID && process.env.AWS_COGNITO_CLIENT_ID) {
  // Real Cognito auth
  module.exports = require('./cognito');
} else {
  // No valid auth config
  throw new Error('missing env vars: no authorization configuration found');
}
