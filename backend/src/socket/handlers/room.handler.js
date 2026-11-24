const RoomService = require('../../services/room.service');
const NotesService = require('../../services/notes.service');
const logger = require('../../utils/logger');

/**
 * Room event handlers
 */
module.exports = (io, roomTracker, leaveCall) => {
    // Tell the room who is online (one entry per person, even with two tabs open)
    const sendPresence = (roomId) => {
        const users = new Map(
            roomTracker.getRoomParticipants(roomId).map(({ userId, username }) => [userId, { userId, username }])
        );
        io.to(roomId).emit('presence', { users: [...users.values()] });
    };

    const leaveCurrentRoom = (socket) => {
        leaveCall(socket);
        const userInfo = roomTracker.removeUserFromRoom(socket.id);
        if (!userInfo) return;

        socket.leave(userInfo.roomId);
        socket.roomId = null;
        sendPresence(userInfo.roomId);

        const isEmpty = () => roomTracker.getRoomCount(userInfo.roomId) === 0;
        if (isEmpty()) {
            NotesService.release(userInfo.roomId, isEmpty)
                .catch((error) => logger.error('Releasing notes failed:', error));
        }

        logger.info(`👋 ${userInfo.username} left room ${userInfo.roomId}`);
    };

    return {
        /**
         * Handle user joining a room (members only)
         */
        handleJoinRoom: async (socket, { roomId }) => {
            const { userId, username } = socket.user;

            await RoomService.requireMember(roomId, userId);

            // The client may have gone away while we checked the database
            if (!socket.connected) return;

            if (socket.roomId === roomId) return; // Already in
            if (socket.roomId) leaveCurrentRoom(socket);

            socket.join(roomId);
            socket.roomId = roomId;
            roomTracker.addUserToRoom(roomId, socket.id, userId, username);

            sendPresence(roomId);

            logger.info(`👤 ${username} joined room ${roomId}`);
        },

        /**
         * Handle user leaving a room explicitly, or disconnecting
         */
        handleLeaveRoom: (socket) => leaveCurrentRoom(socket),
    };
};
