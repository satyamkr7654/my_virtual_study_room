const TokenService = require('../../services/token.service');
const logger = require('../../utils/logger');

// setTimeout overflows above this; longer-lived tokens are re-checked on reconnect
const MAX_TIMEOUT = 2 ** 31 - 1;

/**
 * Socket.io middleware - reject connections without a valid JWT.
 * Identity always comes from the token, never from event payloads.
 */
const authenticateSocket = (socket, next) => {
    try {
        const decoded = TokenService.verifyToken(socket.handshake.auth?.token);

        socket.user = { userId: decoded.userId, username: decoded.username };

        // Do not let a connection outlive its token
        const timer = setTimeout(
            () => socket.disconnect(true),
            Math.min(decoded.exp * 1000 - Date.now(), MAX_TIMEOUT)
        );
        socket.on('disconnect', () => clearTimeout(timer));

        next();
    } catch (error) {
        logger.warn(`Socket rejected: ${error.message}`);
        next(new Error('Unauthorized'));
    }
};

module.exports = authenticateSocket;
