const express = require('express');
const { body, param, query } = require('express-validator');
const RoomController = require('../controllers/room.controller');
const FileController = require('../controllers/file.controller');
const { protect } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');
const { uploadSingle } = require('../middleware/upload.middleware');
const { roomCreationLimiter, roomJoinLimiter, uploadLimiter } = require('../middleware/rateLimiter.middleware');

const router = express.Router();

// Validation rules
const createRoomValidation = [
    body('name')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Room name must be between 1 and 100 characters'),
];

const roomIdValidation = [
    param('id')
        .isMongoId()
        .withMessage('Invalid room ID'),
];

const messagesValidation = [
    ...roomIdValidation,
    query('before')
        .optional()
        .isMongoId()
        .withMessage('Invalid message ID'),
];

const roomCodeValidation = [
    body('code')
        .isString()
        .matches(/^\d{6}$/)
        .withMessage('Invalid room code'),
];

// All routes are protected
router.use(protect);

// Routes
router.route('/')
    .post(roomCreationLimiter, createRoomValidation, validate, RoomController.createRoom)
    .get(RoomController.getAllRooms);

router.post('/join', roomJoinLimiter, roomCodeValidation, validate, RoomController.joinRoom);

router.route('/:id')
    .get(roomIdValidation, validate, RoomController.getRoomById)
    .delete(roomIdValidation, validate, RoomController.deleteRoom);

router.post('/:id/leave', roomIdValidation, validate, RoomController.leaveRoom);

router.get('/:id/messages', messagesValidation, validate, RoomController.getMessages);

router.post('/:id/files', roomIdValidation, validate, FileController.requireMember, uploadLimiter, uploadSingle, FileController.upload);
router.get('/:id/files/:fileId', roomIdValidation, validate, FileController.requireMember, FileController.download);

module.exports = router;
