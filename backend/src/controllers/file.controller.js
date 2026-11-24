const { pipeline } = require('stream/promises');
const FileService = require('../services/file.service');
const RoomService = require('../services/room.service');
const { ValidationError } = require('../utils/errors');

/**
 * File Controller - Handle files shared in a room (members only)
 */
class FileController {
    /**
     * Only members may go on. Runs before the upload is read.
     */
    static async requireMember(req, res, next) {
        await RoomService.requireMember(req.params.id, req.user.userId);
        next();
    }

    /**
     * @route   POST /api/rooms/:id/files
     * @desc    Upload a file to a room
     * @access  Members
     */
    static async upload(req, res) {
        if (!req.file) throw new ValidationError('No file uploaded');

        const file = await FileService.save({
            roomId: req.params.id,
            userId: req.user.userId,
            originalName: req.file.originalname,
            buffer: req.file.buffer,
        });

        res.status(201).json({ success: true, data: { file } });
    }

    /**
     * @route   GET /api/rooms/:id/files/:fileId
     * @desc    Download a file shared in a room
     * @access  Members
     */
    static async download(req, res) {
        const { file, stream } = await FileService.open(req.params.id, req.params.fileId);

        // Always a download, so a shared file can never run as a page
        res.attachment(file.name);
        res.type(file.type);
        res.set('Content-Length', String(file.size));

        try {
            await pipeline(stream, res);
        } catch (error) {
            // The visitor cancelled the download
            if (error.code !== 'ERR_STREAM_PREMATURE_CLOSE') throw error;
        }
    }
}

module.exports = FileController;
