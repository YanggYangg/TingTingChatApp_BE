const multer = require('multer');

const storage = multer.memoryStorage(); // Lưu file vào bộ nhớ dưới dạng buffer

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        // Ảnh
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/jpg',
        'image/webp',

        // Video
        'video/mp4',
        'video/quicktime',
        'video/x-msvideo',
        'video/x-matroska',

        // Văn bản
        'text/plain',
        'application/pdf',

        // Word
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

        // Excel
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

        // PowerPoint
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',

        // File nén
        'application/zip',
        'application/x-rar-compressed',
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('File type not allowed'), false);
    }
};


const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 100 * 1024 * 1024 }, // Tang gioi han len 100MB cho video
});

module.exports = {
    uploadSingle: upload.single('media'),
    uploadMultiple: upload.array('media', 10), // Field name là 'media'
};