const Message = require('../models/Message.model');
const logger = require('../utils/logger');

const PAGE_SIZE = 50;

/**
 * The shape sent to clients, for both history and live messages
 */
const toClient = (message) => ({
    id: message._id,
    userId: message.user,
    username: message.username,
    content: message.content || '',
    fileId: message.fileId || null,
    fileName: message.fileName || null,
    fileType: message.fileType || null,
    clientId: message.clientId || null,
    timestamp: message.timestamp,
});

/**
 * Message Service - Handle message business logic
 */
class MessageService {
    /**
     * Find a message the user already sent with this client ID
     */
    static async findByClientId(userId, clientId) {
        const message = await Message.findOne({ user: userId, clientId });
        return message && toClient(message);
    }

    /**
     * Create a new message
     * @param {Object} messageData - Message data
     * @returns {Promise<Object>} Created message
     */
    static async createMessage({ roomId, userId, username, content, file, clientId }) {
        const message = await Message.create({
            room: roomId,
            user: userId,
            username,
            content,
            clientId,
            ...(file && { fileId: file.id, fileName: file.name, fileType: file.type }),
        });

        logger.debug(`Message created in room ${roomId} by ${username}`);

        return toClient(message);
    }

    /**
     * Get the newest messages of a room, oldest first
     * @param {string} roomId - Room ID
     * @param {string} [before] - Only messages older than this message ID
     * @returns {Promise<Object>} Messages and whether older ones exist
     */
    static async getMessagesByRoom(roomId, before) {
        const found = await Message.find({ room: roomId, ...(before && { _id: { $lt: before } }) })
            .sort({ _id: -1 })
            .limit(PAGE_SIZE + 1);

        return {
            messages: found.slice(0, PAGE_SIZE).reverse().map(toClient),
            hasMore: found.length > PAGE_SIZE,
        };
    }

    /**
     * Delete all messages in a room
     * @param {string} roomId - Room ID
     */
    static async deleteRoomMessages(roomId) {
        const result = await Message.deleteMany({ room: roomId });
        logger.info(`Deleted ${result.deletedCount} messages from room ${roomId}`);
        return result;
    }
}

module.exports = MessageService;
