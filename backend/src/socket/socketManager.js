const RoomTracker = require('./utils/roomTracker');
const { safeHandler } = require('./utils/guards');
const authenticateSocket = require('./middleware/socketAuth');
const roomHandlers = require('./handlers/room.handler');
const callHandlers = require('./handlers/call.handler');
const webrtcHandlers = require('./handlers/webrtc.handler');
const chatHandlers = require('./handlers/chat.handler');
const notesHandlers = require('./handlers/notes.handler');
const logger = require('../utils/logger');

/**
 * Socket.io Manager - Initialize and handle socket connections
 */
const initializeSocket = (io) => {
    const roomTracker = new RoomTracker();

    const callEvents = callHandlers(io, roomTracker);
    const roomEvents = roomHandlers(io, roomTracker, callEvents.leaveCall);
    const webrtcEvents = webrtcHandlers(io, roomTracker);
    const chatEvents = chatHandlers(io);
    const notesEvents = notesHandlers();

    const events = {
        // Room events
        'join-room': roomEvents.handleJoinRoom,
        'leave-room': roomEvents.handleLeaveRoom,

        // Video call events
        'join-call': callEvents.handleJoinCall,
        'leave-call': callEvents.handleLeaveCall,
        'media-state': callEvents.handleMediaState,

        // WebRTC signaling events
        'video-offer': webrtcEvents.handleVideoOffer,
        'video-answer': webrtcEvents.handleVideoAnswer,
        'ice-candidate': webrtcEvents.handleIceCandidate,

        // Chat events
        'chat-message': chatEvents.handleChatMessage,

        // Shared notes events
        'notes-open': notesEvents.handleNotesOpen,
        'notes-update': notesEvents.handleNotesUpdate,
    };

    io.use(authenticateSocket);

    io.on('connection', (socket) => {
        logger.info(`✅ Socket connected: ${socket.id} (${socket.user.username})`);

        Object.entries(events).forEach(([event, handler]) => {
            socket.on(event, safeHandler(socket, event, handler));
        });

        socket.on('disconnect', () => {
            roomEvents.handleLeaveRoom(socket);
            logger.info(`❌ Socket disconnected: ${socket.id}`);
        });
    });

    logger.info('📡 Socket.io initialized successfully');
};

module.exports = initializeSocket;
