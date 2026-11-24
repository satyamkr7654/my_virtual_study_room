const path = require('path');
const mongoose = require('mongoose');
const { pipeline } = require('stream/promises');
const { Readable } = require('stream');
const { ValidationError, NotFoundError } = require('../utils/errors');
const { detectFileType, ALLOWED_EXTENSIONS } = require('../utils/fileTypes');
const logger = require('../utils/logger');

const getBucket = () => new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'files' });

/**
 * File Service - Store shared files in MongoDB (GridFS) so they survive redeploys
 */
class FileService {
    /**
     * Save an uploaded file
     */
    static async save({ roomId, userId, originalName, buffer }) {
        const name = path.basename(originalName).slice(-200);
        const type = detectFileType(path.extname(name).toLowerCase(), buffer);

        if (!type) {
            throw new ValidationError(`This file type is not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`);
        }

        const upload = getBucket().openUploadStream(name, {
            metadata: { room: String(roomId), uploader: String(userId), type },
        });
        await pipeline(Readable.from([buffer]), upload);

        logger.info(`File ${upload.id} uploaded to room ${roomId} by ${userId}`);

        return { id: upload.id, name, type, size: buffer.length };
    }

    /**
     * Find a file belonging to a room
     */
    static async findInRoom(roomId, fileId) {
        if (typeof fileId !== 'string' || !mongoose.isValidObjectId(fileId)) return null;

        const [file] = await getBucket()
            .find({ _id: new mongoose.Types.ObjectId(fileId), 'metadata.room': String(roomId) })
            .toArray();

        return file ? {
            id: file._id,
            name: file.filename,
            type: file.metadata.type,
            uploader: file.metadata.uploader,
            size: file.length,
        } : null;
    }

    /**
     * Open a file for download
     */
    static async open(roomId, fileId) {
        const file = await this.findInRoom(roomId, fileId);
        if (!file) throw new NotFoundError('File not found');

        return { file, stream: getBucket().openDownloadStream(file.id) };
    }

    /**
     * Delete all files of a room
     */
    static async deleteRoomFiles(roomId) {
        const bucket = getBucket();
        const files = await bucket.find({ 'metadata.room': String(roomId) }).toArray();
        await Promise.all(files.map((file) => bucket.delete(file._id)));
    }
}

module.exports = FileService;
