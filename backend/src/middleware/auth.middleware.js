const jwt = require('jsonwebtoken');
const { AuthenticationError } = require('../utils/errors');
const logger = require('../utils/logger');
const { config } = require('../config/environment');

/**
 * Protect routes - JWT authentication middleware
 */
const protect = async (req, res, next) => {
    try {
        let token;

        // Get token from header
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        // Check if token exists
        if (!token) {
            logger.warn(`Auth failed: No token provided for ${req.path}`);
            throw new AuthenticationError('No authentication token provided');
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, config.jwt.secret);

            // Add user info to request
            req.user = {
                userId: decoded.userId,
                username: decoded.username,
            };

            logger.debug(`✅ Auth successful for user: ${decoded.userId}`);
            next();
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                logger.warn(`❌ Auth failed: Token expired at ${error.expiredAt}`);
                throw new AuthenticationError('Token has expired. Please login again.');
            } else if (error.name === 'JsonWebTokenError') {
                logger.warn(`❌ Auth failed: Invalid token - ${error.message}`);
                throw new AuthenticationError('Token is invalid. Please login again.');
            }
            throw error;
        }
    } catch (error) {
        next(error);
    }
};

module.exports = { protect };
