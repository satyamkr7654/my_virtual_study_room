const { ConflictError, AuthorizationError } = require('../../utils/errors');
const { requireInRoom } = require('../utils/guards');

// Everyone sends video to everyone, so larger calls would overload browsers
const MAX_CALL_SIZE = 6;

const toPeer = ({ socketId, userId, username, media }) => ({ socketId, userId, username, media });

/**
 * Video call event handlers.
 * A client joins the call only once it is ready to receive signals, so none are lost.
 */
module.exports = (io, roomTracker) => {
    const leaveCall = (socket) => {
        const info = roomTracker.getUserBySocket(socket.id);
        if (!info?.media) return;

        info.media = null;
        socket.to(info.roomId).emit('call-left', { socketId: socket.id });
    };

    return {
        leaveCall,

        /**
         * Join the call. Returns who is already in it; the newcomer calls each of them.
         */
        handleJoinCall: (socket, { roomId }) => {
            requireInRoom(socket, roomId);

            const info = roomTracker.getUserBySocket(socket.id);
            const others = roomTracker.getRoomParticipants(roomId)
                .filter((p) => p.media && p.socketId !== socket.id);

            if (others.length >= MAX_CALL_SIZE) {
                throw new ConflictError(`The call is full (${MAX_CALL_SIZE} people)`);
            }

            info.media = { audio: false, video: false, screen: false };
            socket.to(roomId).emit('call-joined', toPeer({ socketId: socket.id, ...info }));

            return { participants: others.map(toPeer) };
        },

        /**
         * Leave the call but stay in the room
         */
        handleLeaveCall: (socket) => leaveCall(socket),

        /**
         * Share whether the mic, camera or screen is on
         */
        handleMediaState: (socket, { audio, video, screen }) => {
            requireInRoom(socket, socket.roomId);

            const info = roomTracker.getUserBySocket(socket.id);
            if (!info?.media) throw new AuthorizationError('You are not in the call');

            info.media = { audio: audio === true, video: video === true, screen: screen === true };
            socket.to(info.roomId).emit('media-state', { socketId: socket.id, media: info.media });
        },
    };
};
