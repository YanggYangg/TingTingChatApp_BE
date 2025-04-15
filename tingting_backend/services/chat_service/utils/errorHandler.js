// src/utils/errorHandler.js
const logger = require('./logger');

module.exports = (socket, message, error = null) => {
    logger.error(`Socket error: ${message}`, error || '');
    socket.emit('error', { message, error: error?.message });
};