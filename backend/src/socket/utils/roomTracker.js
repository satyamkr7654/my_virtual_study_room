const RoomService = require('../../services/room.service');
const logger = require('../../utils/logger');

/**
 * Room tracking utility
 */
class RoomTracker {
    constructor() {
        // Map of roomId -> Set of socket IDs
        this.roomParticipants = new Map();
        // Map of userId -> socket ID
        this.userSocketMap = new Map();
        // Map of socketId -> user info
        this.socketUserMap = new Map();
    }

    /**
     * Add user to room
     */
    addUserToRoom(roomId, socketId, userId, username) {
        // Initialize room if it doesn't exist
        if (!this.roomParticipants.has(roomId)) {
            this.roomParticipants.set(roomId, new Set());
        }

        // Add user to room
        this.roomParticipants.get(roomId).add(socketId);
        this.userSocketMap.set(userId, socketId);
        this.socketUserMap.set(socketId, { userId, username, roomId });

        logger.debug(`User ${username} (${socketId}) added to room ${roomId}`);
    }

    /**
     * Remove user from room
     */
    removeUserFromRoom(socketId) {
        const userInfo = this.socketUserMap.get(socketId);

        if (!userInfo) return null;

        const { roomId, userId, username } = userInfo;

        // Remove from room
        if (this.roomParticipants.has(roomId)) {
            this.roomParticipants.get(roomId).delete(socketId);

            // Clean up empty rooms
            if (this.roomParticipants.get(roomId).size === 0) {
                this.roomParticipants.delete(roomId);
                logger.info(`Room ${roomId} is now empty and removed from tracker`);
            }
        }

        // Remove from maps
        this.userSocketMap.delete(userId);
        this.socketUserMap.delete(socketId);

        logger.debug(`User ${username} (${socketId}) removed from room ${roomId}`);

        return userInfo;
    }

    /**
     * Get participants in a room
     */
    getRoomParticipants(roomId) {
        const participantIds = this.roomParticipants.get(roomId);
        if (!participantIds) return [];

        return Array.from(participantIds).map(socketId => {
            const userInfo = this.socketUserMap.get(socketId);
            return {
                socketId,
                username: userInfo ? userInfo.username : 'Unknown',
                userId: userInfo ? userInfo.userId : null,
                media: userInfo?.media || null, // Set while in the video call
            };
        });
    }

    /**
     * Get user info by socket ID
     */
    getUserBySocket(socketId) {
        return this.socketUserMap.get(socketId);
    }

    /**
     * Get participant count for a room
     */
    getRoomCount(roomId) {
        return this.roomParticipants.get(roomId)?.size || 0;
    }

    /**
     * Get all active rooms
     */
    getActiveRooms() {
        return Array.from(this.roomParticipants.keys());
    }
}

module.exports = RoomTracker;
