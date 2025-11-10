/**
 * Creates a Basic Auth header string from the given credentials
 * @param {string} username - The username or email
 * @param {string} password - The password
 * @returns {string} Basic Auth header value
 */
function createBasicAuthHeader(username, password) {
  const base64 = Buffer.from(`${username}:${password}`).toString('base64');
  return `Basic ${base64}`;
}

/**
 * Waits for a specified number of milliseconds
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  createBasicAuthHeader,
  wait
};
