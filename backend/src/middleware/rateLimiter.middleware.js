const rateLimit = require('express-rate-limit');
const { config } = require('../config/environment');

// Same shape as every other API error
const message = (error) => ({ success: false, error });

/**
 * General API rate limiter
 */
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: config.rateLimit.max, // Requests per IP per windowMs
    message: message('Too many requests from this IP, please try again later.'),
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Strict rate limiter for authentication routes
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 failed login/register requests per windowMs
    message: message('Too many authentication attempts, please try again after 15 minutes.'),
    skipSuccessfulRequests: true, // Don't count successful requests
});

/**
 * Moderate rate limiter for room creation
 */
const roomCreationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 room creations per hour
    message: message('Too many rooms created, please try again later.'),
});

/**
 * Stops room codes from being guessed. Must run after `protect`.
 */
const roomJoinLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each user to 10 wrong codes per windowMs
    keyGenerator: (req) => req.user.userId,
    message: message('Too many wrong room codes, please try again later.'),
    skipSuccessfulRequests: true,
});

/**
 * Limits uploads. Must run after `protect`.
 */
const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each user to 20 uploads per windowMs
    keyGenerator: (req) => req.user.userId,
    message: message('Too many uploads, please try again later.'),
});

module.exports = {
    apiLimiter,
    authLimiter,
    roomCreationLimiter,
    roomJoinLimiter,
    uploadLimiter,
};
