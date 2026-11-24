const express = require('express');
const authRoutes = require('./auth.routes');
const roomRoutes = require('./room.routes');

const router = express.Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/rooms', roomRoutes);

// Health check
router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'API is running',
        timestamp: new Date().toISOString(),
    });
});

module.exports = router;
