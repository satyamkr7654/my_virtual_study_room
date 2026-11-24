/**
 * Environment configuration and validation
 */

const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];

const validateEnv = () => {
    const missing = requiredEnvVars.filter((varName) => !process.env[varName]);

    if (missing.length > 0) {
        throw new Error(
            `Missing required environment variables: ${missing.join(', ')}`
        );
    }

    // A guessable secret lets anyone forge a login
    const secret = process.env.JWT_SECRET;
    if (secret.length < 32 || /your|replace|change|secret-key/i.test(secret)) {
        const problem = 'JWT_SECRET must be a random value of at least 32 characters';
        if (process.env.NODE_ENV === 'production') throw new Error(problem);
        console.warn(`WARNING: ${problem}`);
    }
};

const config = {
    env: process.env.NODE_ENV || 'development',
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
    port: parseInt(process.env.PORT, 10) || 5000,

    // Number of reverse proxies in front of the app (Railway/Render: 1)
    trustProxy: parseInt(process.env.TRUST_PROXY, 10) || 0,

    // Database
    db: {
        uri: process.env.MONGODB_URI,
    },

    // JWT
    jwt: {
        secret: process.env.JWT_SECRET,
        expire: process.env.JWT_EXPIRE || '24h',
    },

    // CORS
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
    },

    // Logging
    logging: {
        level: process.env.LOG_LEVEL || 'info',
    },

    // Rate limiting
    rateLimit: {
        max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 1000,
    },
};

module.exports = { config, validateEnv };
