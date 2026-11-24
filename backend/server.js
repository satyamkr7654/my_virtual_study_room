require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');
const connectDB = require('./src/config/database');
const initializeSocket = require('./src/socket/socketManager');
const { config, validateEnv } = require('./src/config/environment');
const NotesService = require('./src/services/notes.service');
const logger = require('./src/utils/logger');

// Validate environment variables
try {
  validateEnv();
} catch (error) {
  console.error(`Environment validation failed: ${error.message}`);
  process.exit(1);
}

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: config.cors.origin,
    credentials: true,
    methods: ['GET', 'POST'],
  },
});

// Initialize socket handlers
initializeSocket(io);

// Let controllers notify connected clients
app.set('io', io);

// Connect to database
connectDB();

// Graceful shutdown
const shutdown = async (signal) => {
  logger.info(`${signal} signal received: saving notes and closing`);
  await NotesService.flush();
  // Also disconnects every socket; otherwise open ones would keep the server alive
  io.close(() => process.exit(0));
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
const PORT = config.port;
server.listen(PORT, () => {
  logger.info(`🚀 Server running in ${config.env} mode on port ${PORT}`);
  logger.info(`📡 Socket.io ready`);
  logger.info(`🔗 API available at http://localhost:${PORT}/api`);
});
