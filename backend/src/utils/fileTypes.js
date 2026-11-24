/**
 * File types that may be shared, with the bytes each one must start with
 */
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
const JPG = Buffer.from([0xff, 0xd8, 0xff]);
const GIF = Buffer.from('GIF8');
const PDF = Buffer.from('%PDF');
const ZIP = Buffer.from('PK'); // Also docx, pptx and xlsx
const OLE = Buffer.from([0xd0, 0xcf, 0x11, 0xe0]); // Old Office formats
const RIFF = Buffer.from('RIFF');
const OFFICE = 'application/vnd.openxmlformats-officedocument';

const FILE_TYPES = {
    '.pdf': ['application/pdf', PDF],
    '.png': ['image/png', PNG],
    '.jpg': ['image/jpeg', JPG],
    '.jpeg': ['image/jpeg', JPG],
    '.gif': ['image/gif', GIF],
    '.webp': ['image/webp', RIFF],
    '.txt': ['text/plain'],
    '.md': ['text/markdown'],
    '.csv': ['text/csv'],
    '.doc': ['application/msword', OLE],
    '.ppt': ['application/vnd.ms-powerpoint', OLE],
    '.xls': ['application/vnd.ms-excel', OLE],
    '.docx': [`${OFFICE}.wordprocessingml.document`, ZIP],
    '.pptx': [`${OFFICE}.presentationml.presentation`, ZIP],
    '.xlsx': [`${OFFICE}.spreadsheetml.sheet`, ZIP],
    '.zip': ['application/zip', ZIP],
};

/**
 * Content type for an allowed file, or null if it must be rejected
 */
const detectFileType = (extension, buffer) => {
    const [type, signature] = FILE_TYPES[extension] || [];
    if (!type) return null;
    if (signature) {
        return buffer.subarray(0, signature.length).equals(signature) ? type : null;
    }
    // Text files must not contain binary data
    return buffer.includes(0) ? null : type;
};

module.exports = { detectFileType, ALLOWED_EXTENSIONS: Object.keys(FILE_TYPES) };
