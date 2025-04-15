// src/utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
    level: 'info', // Ghi log từ info trở lên (bao gồm info, warn, error)
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), // Thêm timestamp
        winston.format.errors({ stack: true }), // Ghi cả stack trace nếu có lỗi
        winston.format.json() // Định dạng JSON
    ),
    transports: [
        // Console transport: Ghi tất cả log từ info trở lên
        new winston.transports.Console({
            level: 'info',
            format: winston.format.combine(
                winston.format.colorize(), // Thêm màu sắc cho console
                winston.format.simple() // Định dạng đơn giản cho console
            )
        }),
        // File transport: Chỉ ghi log lỗi vào file
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error' // Chỉ ghi log ở mức error
        })
    ]
});

module.exports = logger;