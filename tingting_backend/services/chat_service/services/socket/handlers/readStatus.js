// src/services/socket/handlers/readStatus.js
const Message = require('../../../models/Message');
const logger = require('../../../utils/logger');
const errorHandler = require('../../../utils/errorHandler');

module.exports = {
    async handleReadMessage(socket, { conversationId, messageId }, userId, io) {
        if (!conversationId || !messageId || !userId) {
            return errorHandler(socket, 'Invalid read message data');
        }

        try {
            const message = await Message.findById(messageId);
            if (!message) {
                return errorHandler(socket, 'Message not found');
            }

            if (!message.status.readBy.includes(userId)) {
                message.status.readBy.push(userId);
                await message.save();

                io.to(conversationId).emit('messageRead', {
                    messageId,
                    userId,
                    readBy: message.status.readBy,
                });
                logger.info(`User ${userId} read message ${messageId}`);
            }
        } catch (error) {
            errorHandler(socket, 'Failed to mark message as read', error);
        }
    },
};