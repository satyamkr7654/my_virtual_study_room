const NotesService = require('../../services/notes.service');
const { requireInRoom } = require('../utils/guards');

/**
 * Shared notes event handlers
 */
module.exports = () => {
    return {
        /**
         * Send the current notes to someone opening them
         */
        handleNotesOpen: async (socket, { roomId }) => {
            requireInRoom(socket, roomId);
            return { state: await NotesService.getState(roomId) };
        },

        /**
         * Merge an edit and pass it on to everyone else
         */
        handleNotesUpdate: async (socket, { roomId, update }) => {
            requireInRoom(socket, roomId);
            await NotesService.applyUpdate(roomId, update);
            socket.to(roomId).emit('notes-update', { update });
        },
    };
};
