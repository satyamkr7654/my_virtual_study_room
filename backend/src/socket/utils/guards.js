const logger = require('../../utils/logger');
const { AppError, AuthorizationError, ValidationError } = require('../../utils/errors');

/**
 * Wrap an event handler so bad input or a failure can never crash the server.
 * If the client asked for an acknowledgement, the result or error goes there.
 */
const safeHandler = (socket, event, handler) => async (data, ack) => {
    try {
        if (data === null || typeof data !== 'object' || Array.isArray(data)) {
            throw new ValidationError('Invalid event data');
        }
        const result = await handler(socket, data);
        if (typeof ack === 'function') ack({ ok: true, data: result });
    } catch (error) {
        if (!error.isOperational) {
            logger.error(`Socket event ${event} failed:`, error);
        }
        const message = error instanceof AppError ? error.message : 'Something went wrong';
        if (typeof ack === 'function') {
            ack({ ok: false, message, status: error.statusCode || 500 });
        } else {
            socket.emit('error', { event, message });
        }
    }
};

/**
 * Require that the socket has joined the room it is acting on.
 */
const requireInRoom = (socket, roomId) => {
    if (typeof roomId !== 'string' || socket.roomId !== roomId || !socket.rooms.has(roomId)) {
        throw new AuthorizationError('You are not in this room');
    }
};

/**
 * Require a string no longer than max characters.
 */
const requireText = (value, max, label) => {
    if (typeof value !== 'string' || value.length > max) {
        throw new ValidationError(`${label} must be text of at most ${max} characters`);
    }
};

module.exports = { safeHandler, requireInRoom, requireText };
