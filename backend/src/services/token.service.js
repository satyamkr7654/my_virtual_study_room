const jwt = require('jsonwebtoken');
const { config } = require('../config/environment');

/**
 * Token Service - Handle JWT operations
 */
class TokenService {
  /**
   * Generate JWT token
   * @param {Object} payload - Data to encode in token
   * @returns {string} JWT token
   */
  static generateToken(payload) {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expire,
    });
  }

  /**
   * Verify JWT token
   * @param {string} token - Token to verify
   * @returns {Object} Decoded payload
   */
  static verifyToken(token) {
    return jwt.verify(token, config.jwt.secret);
  }

  /**
   * Decode token without verification (for debugging)
   * @param {string} token - Token to decode
   * @returns {Object} Decoded payload
   */
  static decodeToken(token) {
    return jwt.decode(token);
  }
}

module.exports = TokenService;
