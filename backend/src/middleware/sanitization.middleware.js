/**
 * Manual sanitization middleware compatible with Express 5.x
 * Prevents NoSQL injection by removing dangerous characters
 * Does not modify read-only req.query directly
 */

const sanitizeObject = (obj) => {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
    }

    const sanitized = {};
    for (const key in obj) {
        if (Object.hasOwn(obj, key)) { // req.query has no prototype in Express 5
            // Remove keys that contain $ or .
            if (key.includes('$') || key.includes('.')) {
                console.warn(`Sanitized dangerous key: ${key}`);
                continue;
            }
            sanitized[key] = sanitizeObject(obj[key]);
        }
    }
    return sanitized;
};

const sanitizeInput = (req, res, next) => {
    // Sanitize body
    if (req.body) {
        req.body = sanitizeObject(req.body);
    }

    // Sanitize params
    if (req.params) {
        req.params = sanitizeObject(req.params);
    }

    // For query, we need to be careful with Express 5
    // Instead of replacing req.query, we modify its values
    if (req.query && typeof req.query === 'object') {
        const sanitized = sanitizeObject(req.query);
        // Clear and reassign properties instead of replacing the object
        for (const key in req.query) {
            delete req.query[key];
        }
        Object.assign(req.query, sanitized);
    }

    next();
};

module.exports = { sanitizeInput };

