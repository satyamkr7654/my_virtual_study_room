const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { NotFoundError } = require('../utils/errors');

/**
 * Centralized error handling middleware
 */
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    // Log error
    logger.error({
        message: error.message,
        stack: error.stack,
        statusCode: error.statusCode,
        path: req.path,
        method: req.method,
    });

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        error.message = 'Resource not found';
        error.statusCode = 404;
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        error.message = 'Duplicate field value entered';
        error.statusCode = 409;
    }

    // Mongoose validation error (our own ValidationError shares the name but has no `errors` map)
    if (err instanceof mongoose.Error.ValidationError) {
        const messages = Object.values(err.errors).map((val) => val.message);
        error.message = messages.join(', ');
        error.statusCode = 400;
    }

    // Upload errors
    if (err.name === 'MulterError') {
        const tooLarge = err.code === 'LIMIT_FILE_SIZE';
        error.message = tooLarge ? 'File is larger than 10MB' : err.message;
        error.statusCode = tooLarge ? 413 : 400;
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        error.message = 'Invalid token. Please login again.';
        error.statusCode = 401;
    }

    if (err.name === 'TokenExpiredError') {
        error.message = 'Token has expired. Please login again.';
        error.statusCode = 401;
    }

    const statusCode = error.statusCode || 500;
    const message = error.message || 'Server Error';

    res.status(statusCode).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    });
};

/**
 * Handle 404 routes
 */
const notFound = (req, res, next) => {
    next(new NotFoundError(`Not Found - ${req.originalUrl}`));
};

module.exports = { errorHandler, notFound };
