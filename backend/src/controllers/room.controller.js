const RoomService = require('../services/room.service');
const MessageService = require('../services/message.service');
const FileService = require('../services/file.service');
const NotesService = require('../services/notes.service');

/**
 * Room Controller - Handle HTTP requests for rooms
 */
class RoomController {
    /**
     * @route   POST /api/rooms
     * @desc    Create a new room
     * @access  Private
     */
    static async createRoom(req, res, next) {
        try {
            const { name } = req.body;
            const room = await RoomService.createRoom(name, req.user.userId);

            res.status(201).json({
                success: true,
                message: 'Room created successfully',
                data: { room },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * @route   GET /api/rooms
     * @desc    Get the current user's rooms
     * @access  Private
     */
    static async getAllRooms(req, res, next) {
        try {
            const rooms = await RoomService.getRoomsForUser(req.user.userId);

            // People inside each room right now
            const io = req.app.get('io');
            const online = await Promise.all(rooms.map(async (room) => {
                const sockets = io ? await io.in(room.id).fetchSockets() : [];
                return new Set(sockets.map((socket) => socket.user?.userId)).size;
            }));

            res.status(200).json({
                success: true,
                data: { rooms: rooms.map((room, i) => ({ ...room.toObject(), online: online[i] })) },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * @route   GET /api/rooms/:id
     * @desc    Get room by ID
     * @access  Private
     */
    static async getRoomById(req, res, next) {
        try {
            const room = await RoomService.getRoomById(req.params.id, req.user.userId);

            res.status(200).json({
                success: true,
                data: { room },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * @route   POST /api/rooms/join
     * @desc    Join a room with its code
     * @access  Private
     */
    static async joinRoom(req, res, next) {
        try {
            const room = await RoomService.joinByCode(req.body.code, req.user.userId);

            res.status(200).json({
                success: true,
                data: { room },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * @route   POST /api/rooms/:id/leave
     * @desc    Give up membership (not for the host)
     * @access  Members
     */
    static async leaveRoom(req, res, next) {
        try {
            const { userId } = req.user;
            await RoomService.leaveRoom(req.params.id, userId);

            // Close the room in any other tab this user has open
            const io = req.app.get('io');
            const sockets = io ? await io.in(req.params.id).fetchSockets() : [];
            sockets.filter((socket) => socket.user?.userId === userId).forEach((socket) => {
                socket.emit('membership-ended');
                socket.disconnect(true);
            });

            res.status(200).json({ success: true, message: 'You left the room' });
        } catch (error) {
            next(error);
        }
    }

    /**
     * @route   DELETE /api/rooms/:id
     * @desc    Delete room (host only)
     * @access  Private
     */
    static async deleteRoom(req, res, next) {
        try {
            await RoomService.deleteRoom(req.params.id, req.user.userId);

            // Remove anyone still inside before clearing the room's data
            const io = req.app.get('io');
            if (io) {
                io.to(req.params.id).emit('room-deleted');
                io.in(req.params.id).socketsLeave(req.params.id);
            }

            NotesService.discard(req.params.id);
            await MessageService.deleteRoomMessages(req.params.id);
            await FileService.deleteRoomFiles(req.params.id);

            res.status(200).json({
                success: true,
                message: 'Room deleted successfully',
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * @route   GET /api/rooms/:id/messages
     * @desc    Get messages for a room
     * @access  Private
     */
    static async getMessages(req, res, next) {
        try {
            await RoomService.requireMember(req.params.id, req.user.userId);
            const { messages, hasMore } = await MessageService.getMessagesByRoom(req.params.id, req.query.before);

            res.status(200).json({
                success: true,
                data: { messages, hasMore },
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = RoomController;
