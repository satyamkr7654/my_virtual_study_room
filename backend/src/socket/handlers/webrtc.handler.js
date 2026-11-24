const { requireInRoom } = require('../utils/guards');
const { AuthorizationError } = require('../../utils/errors');

/**
 * WebRTC signaling event handlers
 * Signals are only relayed between two sockets in the same room.
 */
module.exports = (io, roomTracker) => {
    const relay = (event, field) => (socket, data) => {
        requireInRoom(socket, socket.roomId);

        if (roomTracker.getUserBySocket(data.to)?.roomId !== socket.roomId) {
            throw new AuthorizationError('That participant is not in this room');
        }

        socket.to(data.to).emit(event, {
            [field]: data[field],
            from: socket.id,
            username: socket.user.username,
        });
    };

    return {
        handleVideoOffer: relay('video-offer', 'offer'),
        handleVideoAnswer: relay('video-answer', 'answer'),
        handleIceCandidate: relay('ice-candidate', 'candidate'),
    };
};
