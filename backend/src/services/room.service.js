const mongoose = require('mongoose');
const Room = require('../models/Room.model');
const { NotFoundError, ValidationError, AuthorizationError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * Room Service - Handle room business logic
 */
class RoomService {
    /**
     * Generate unique 6-digit room code
     * @returns {Promise<string>} Unique room code
     */
    static async generateUniqueCode() {
        let code;
        let existingRoom;

        do {
            code = Math.floor(100000 + Math.random() * 900000).toString();
            existingRoom = await Room.findOne({ code });
        } while (existingRoom);

        return code;
    }

    /**
     * Create a new room
     * @param {string} name - Room name
     * @param {string} userId - Creator user ID
     * @returns {Promise<Object>} Created room
     */
    static async createRoom(name, userId) {
        if (!name) {
            throw new ValidationError('Room name is required');
        }

        const code = await this.generateUniqueCode();

        const room = await Room.create({
            name,
            code,
            host: userId,
            participants: [userId],
        });

        logger.info(`Room created: ${room.name} (${room._id}) by user ${userId}`);

        return {
            id: room._id,
            name: room.name,
            code: room.code,
            host: room.host,
            participants: room.participants,
            createdAt: room.createdAt,
        };
    }

    /**
     * Get the rooms a user hosts or has joined
     * @param {string} userId - User ID
     * @returns {Promise<Array>} List of rooms
     */
    static async getRoomsForUser(userId) {
        const rooms = await Room.find({ $or: [{ host: userId }, { participants: userId }] })
            .select('-documentContent')
            .populate('host', 'username')
            .populate('participants', 'username')
            .sort({ createdAt: -1 })
            .limit(50);

        return rooms;
    }

    /**
     * Require that a user hosts or has joined a room
     * @param {string} roomId - Room ID
     * @param {string} userId - User ID
     */
    static async requireMember(roomId, userId) {
        if (typeof roomId !== 'string' || !mongoose.isValidObjectId(roomId)) {
            throw new ValidationError('Invalid room ID');
        }

        const room = await Room.findById(roomId).select('host participants');
        if (!room) {
            throw new NotFoundError('Room not found');
        }

        const isMember = room.host.equals(userId) || room.participants.some((id) => id.equals(userId));
        if (!isMember) {
            throw new AuthorizationError('Join this room with its code first');
        }
    }

    /**
     * Give up membership of a room
     * @param {string} roomId - Room ID
     * @param {string} userId - User ID
     */
    static async leaveRoom(roomId, userId) {
        await this.requireMember(roomId, userId);

        const { host } = await Room.findById(roomId).select('host');
        if (host.equals(userId)) {
            throw new ValidationError('The host cannot leave. Delete the room instead.');
        }

        await Room.updateOne({ _id: roomId }, { $pull: { participants: userId } });
        logger.info(`User ${userId} gave up membership of room ${roomId}`);
    }

    /**
     * Get room by ID (members only)
     * @param {string} roomId - Room ID
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Room data
     */
    static async getRoomById(roomId, userId) {
        await this.requireMember(roomId, userId);

        const room = await Room.findById(roomId)
            .select('-documentContent')
            .populate('host', 'username')
            .populate('participants', 'username');

        if (!room) {
            throw new NotFoundError('Room not found');
        }

        return room;
    }

    /**
     * Join a room with its code
     * @param {string} code - Room code
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Room data
     */
    static async joinByCode(code, userId) {
        const room = await Room.findOneAndUpdate(
            { code },
            { $addToSet: { participants: userId } },
            { returnDocument: 'after' }
        )
            .select('-documentContent')
            .populate('host', 'username')
            .populate('participants', 'username');

        if (!room) {
            throw new NotFoundError('Room not found');
        }

        return room;
    }

    /**
     * Delete room (host only)
     * @param {string} roomId - Room ID
     * @param {string} userId - User ID attempting deletion
     */
    static async deleteRoom(roomId, userId) {
        const room = await Room.findById(roomId);

        if (!room) {
            throw new NotFoundError('Room not found');
        }

        if (room.host.toString() !== userId) {
            throw new AuthorizationError('Not authorized to delete this room');
        }

        await Room.findByIdAndDelete(roomId);
        logger.info(`Room deleted: ${room.name} (${roomId}) by user ${userId}`);
    }
}

module.exports = RoomService;
