// src/services/socket/handlers/messaging.js
const Message = require('../../../models/Message');
const logger = require('../../../utils/logger');
const errorHandler = require('../../../utils/errorHandler');

module.exports = {
    async handleSendMessage(socket, { conversationId, message }, userId, io) {
        if (!conversationId || !message) {
            return errorHandler(socket, 'Invalid message data');
        }

        if (!message.content?.trim() && message.messageType === 'text') {
            return errorHandler(socket, 'Text message cannot be empty');
        }

        if (['image', 'file', 'video'].includes(message.messageType) && !message.linkURL) {
            return errorHandler(socket, 'File message must have a linkURL');
        }

        try {
            const newMessage = new Message({
                conversationId,
                userId,
                content: message.content?.trim() || '',
                messageType: message.messageType,
                linkURL: message.linkURL || null,
                status: {
                    sent: true,
                    receivedBy: [],
                    readBy: [],
                },
                createdAt: new Date(),
            });

            await newMessage.save();
            logger.info(`Message saved: ${newMessage._id}`);

            socket.to(conversationId).emit('receiveMessage', newMessage);
            socket.emit('messageSent', newMessage);
        } catch (error) {
            errorHandler(socket, 'Failed to send message', error);
        }
    },
};