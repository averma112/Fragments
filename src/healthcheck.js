const http = require('http');
const { URL } = require('url');

// Get the server URL from environment variables or use default
// Use PORT env var if available (ECS sets this), otherwise default to 8080
const port = process.env.PORT || 8080;
const serverUrl = process.env.API_URL || `http://localhost:${port}`;
const url = new URL('/', serverUrl);

// Set a timeout for the health check
const options = {
  hostname: url.hostname,
  port: url.port || (url.protocol === 'https:' ? 443 : 80),
  path: url.pathname,
  method: 'GET',
  timeout: 5000, // 5 second timeout
  headers: {
    'User-Agent': 'Docker-Health-Check',
    'Accept': 'application/json',
  },
};

const request = http.request(options, (res) => {
  // Check if the status code is 2xx
  if (res.statusCode >= 200 && res.statusCode < 300) {
    let data = '';
    
    // Collect data
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    // When the response ends, check if the status is 'ok'
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        if (result.status === 'ok') {
          process.exit(0); // Success
        } else {
          console.error('Health check failed: Invalid status in response');
          process.exit(1); // Failure
        }
      } catch (e) {
        console.error('Health check failed: Invalid JSON response');
        process.exit(1); // Failure
      }
    });
  } else {
    console.error(`Health check failed: Status code ${res.statusCode}`);
    process.exit(1); // Failure
  }
});

request.on('error', (err) => {
  console.error(`Health check error: ${err.message}`);
  process.exit(1); // Failure
});

request.on('timeout', () => {
  console.error('Health check timed out');
  request.destroy();
  process.exit(1); // Failure
});

request.end();
