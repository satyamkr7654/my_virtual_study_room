require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const { config } = require('./config/environment');
const { errorHandler, notFound } = require('./middleware/error.middleware');
const { sanitizeInput } = require('./middleware/sanitization.middleware');
const { apiLimiter } = require('./middleware/rateLimiter.middleware');
const routes = require('./routes');
const logger = require('./utils/logger');

const app = express();

// Needed behind a proxy so rate limits see each visitor's own IP
app.set('trust proxy', config.trustProxy);

// Security middleware
app.use(helmet());
app.use(cors(config.cors));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request sanitization
app.use(sanitizeInput);

// HTTP request logger
if (config.isDevelopment) {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined', { stream: logger.stream }));
}

// Apply rate limiting to all API routes
app.use('/api', apiLimiter);

// Mount routes
app.use('/api', routes);

// Handle 404 routes
app.use(notFound);

// Error handling middleware (must be last)
app.use(errorHandler);

module.exports = app;
