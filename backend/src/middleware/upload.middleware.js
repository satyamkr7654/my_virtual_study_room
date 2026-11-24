const multer = require('multer');

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Accept a single file in the "file" field, held in memory until it is checked
 */
const uploadSingle = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE, files: 1 },
    defParamCharset: 'utf8',
}).single('file');

module.exports = { uploadSingle };
