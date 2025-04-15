// src/services/socket/handlers/typing.js
const logger = require('../../../utils/logger');
const errorHandler = require('../../../utils/errorHandler');

module.exports = {
    handleTyping(socket, { conversationId }, userId) {
        if (!conversationId || !userId) {
            return errorHandler(socket, 'Invalid typing data');
        }
        socket.to(conversationId).emit('userTyping', { userId, conversationId });
        logger.info(`User ${userId} is typing in conversation ${conversationId}`);
    },

    handleStopTyping(socket, { conversationId }, userId) {
        if (!conversationId || !userId) {
            return errorHandler(socket, 'Invalid typing data');
        }
        socket.to(conversationId).emit('userStopTyping', { userId, conversationId });
        logger.info(`User ${userId} stopped typing in conversation ${conversationId}`);
    },
};