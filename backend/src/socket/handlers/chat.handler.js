const MessageService = require('../../services/message.service');
const FileService = require('../../services/file.service');
const { ValidationError } = require('../../utils/errors');
const { requireInRoom, requireText } = require('../utils/guards');

const MAX_MESSAGE_LENGTH = 2000;

/**
 * Chat message event handlers
 */
module.exports = (io) => {
    return {
        /**
         * Handle chat message. The result is returned to the sender's acknowledgement.
         */
        handleChatMessage: async (socket, { roomId, content, fileId, clientId }) => {
            requireInRoom(socket, roomId);

            const { userId, username } = socket.user;
            const text = content ?? '';
            requireText(text, MAX_MESSAGE_LENGTH, 'Message');

            if (clientId !== undefined) {
                requireText(clientId, 64, 'Client ID');
                // A retry of a message we already saved
                const existing = await MessageService.findByClientId(userId, clientId);
                if (existing) return existing;
            }

            let file;
            if (fileId) {
                file = await FileService.findInRoom(roomId, fileId);
                if (!file || file.uploader !== userId) {
                    throw new ValidationError('File not found');
                }
            } else if (!text.trim()) {
                throw new ValidationError('Message cannot be empty');
            }

            const message = await MessageService.createMessage({
                roomId, userId, username, content: text, file, clientId,
            });

            // Broadcast to all in room (including sender)
            io.to(roomId).emit('chat-message', message);

            return message;
        },
    };
};
