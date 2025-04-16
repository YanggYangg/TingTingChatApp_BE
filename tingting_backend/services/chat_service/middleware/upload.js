const multer = require('multer');

const storage = multer.memoryStorage(); // Lưu file vào bộ nhớ dưới dạng buffer

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'image/jpeg', 
        'image/png', 
        'image/gif', 
        'image/jpg',
        'video/mp4',
        'video/quicktime', // .mov
        'video/x-msvideo', // .avi
        'video/x-matroska', // .mkv
        'text/plain',  // Cho phép file văn bản (txt)
        'application/pdf',  // Cho phép file PDF
        'application/msword',  // Cho phép file DOC
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'  // Cho phép file DOCX
    ];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only images are allowed'), false);
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