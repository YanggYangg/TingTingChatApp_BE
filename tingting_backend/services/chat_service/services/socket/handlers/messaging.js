// src/services/socket/handlers/messaging.js
const Message = require('../../../models/Message');
const Conversation = require('../../../models/Conversation');

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

            const savedMessage = await newMessage.save();
            logger.info(`Message saved: ${savedMessage._id}`);

            // Update the last message in the conversation
            const conversation = await Conversation.findById(conversationId);
            if (conversation) {
                conversation.lastMessage = savedMessage._id;
                conversation.updatedAt = new Date();
                await conversation.save();
                logger.info(`Conversation updated: ${conversationId}`);

                // Emit events
                socket.to(conversationId).emit('receiveMessage', savedMessage);
                socket.emit('messageSent', savedMessage);

                // Emit conversation update event to all users in the conversation
                io.to(conversationId).emit('conversationUpdated', {
                    conversationId,
                    lastMessage: savedMessage,
                    updatedAt: conversation.updatedAt
                });
            }
        } catch (error) {
            errorHandler(socket, 'Failed to send message', error);
        }
    },
    handleDeleteMessage(socket, { messageId, conversationId }, userId) {

        if (!messageId || !conversationId) {
            return errorHandler(socket, 'Invalid message data');
        }
        try {
            // Xóa tin nhắn khỏi cơ sở dữ liệu
            Message.findByIdAndDelete(messageId)
                .then(() => {
                    logger.info(`Message deleted: ${messageId}`);

                    //load lại danh sách tin nhắn trong cuộc trò chuyện
                    Message.find({ conversationId })
                        .sort({ createdAt: -1 })
                        .then((messages) => {
                            socket.to(conversationId).emit('loadMessages', messages.reverse());
                            socket.emit('messageDeleted', messageId);
                        })
                        .catch((error) => {
                            errorHandler(socket, 'Failed to load messages after deletion', error);
                        });
                })
                .catch((error) => {
                    errorHandler(socket, 'Failed to delete message', error);
                });


        } catch (error) {
            errorHandler(socket, 'Failed to delete message', error);

        }
    }


};