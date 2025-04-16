const Message = require('../../../models/Message');
const Conversation = require('../../../models/Conversation');
const logger = require('../../../utils/logger');
const errorHandler = require('../../../utils/errorHandler');

module.exports = {
    // Xử lý gửi tin nhắn
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

            // Cập nhật tin nhắn cuối trong cuộc trò chuyện
            const conversation = await Conversation.findById(conversationId);
            if (conversation) {
                conversation.lastMessage = savedMessage._id;
                conversation.updatedAt = new Date();
                await conversation.save();
                logger.info(`Conversation updated: ${conversationId}`);

                // Emit các sự kiện
                socket.to(conversationId).emit('receiveMessage', savedMessage);
                socket.emit('messageSent', savedMessage);

                // Emit thông tin cập nhật cuộc trò chuyện cho tất cả người dùng
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

    // Xử lý xóa tin nhắn
    async handleDeleteMessage(socket, { messageId }, userId, io) {
        try {
            const message = await Message.findById(messageId);
            if (!message) return errorHandler(socket, 'Message not found');

            await Message.updateOne(
                { _id: messageId },
                { $addToSet: { deletedBy: userId } }
            );

            const conversation = await Conversation.findById(message.conversationId);
            if (!conversation) return errorHandler(socket, 'Conversation not found');

            if (conversation.lastMessage?.toString() === messageId.toString()) {
                const lastValidMessage = await Message.findOne({
                    conversationId: message.conversationId,
                    isRevoked: false,
                    deletedBy: { $ne: userId } // Loại bỏ tin nhắn đã bị xóa
                }).sort({ createdAt: -1 });

                conversation.lastMessage = lastValidMessage ? lastValidMessage._id : null;
                conversation.updatedAt = new Date();
                await conversation.save();

                io.to(message.conversationId.toString()).emit('conversationUpdated', {
                    conversationId: message.conversationId,
                    lastMessage: lastValidMessage || null,
                    updatedAt: conversation.updatedAt,
                });
            }

            socket.to(message.conversationId).emit('messageDeleted', { messageId });
            logger.info(`Message deleted: ${messageId}`);
        } catch (error) {
            errorHandler(socket, 'Failed to delete message', error);
        }
    },

    // Xử lý thu hồi tin nhắn
    async handleRevokeMessage(socket, { messageId }, userId, io) {
        try {
            const message = await Message.findById(messageId);
            if (!message) return errorHandler(socket, 'Message not found');

            if (message.userId.toString() !== userId.toString()) {
                return errorHandler(socket, 'You cannot revoke this message');
            }

            message.isRevoked = true;
            await message.save();

            // Kiểm tra xem tin nhắn thu hồi có phải là tin nhắn cuối cùng không
            const conversation = await Conversation.findById(message.conversationId);
            if (!conversation) return errorHandler(socket, 'Conversation not found');

            if (conversation.lastMessage?.toString() === messageId.toString()) {
                // Tìm tin nhắn gần nhất không bị thu hồi và không bị xóa
                const lastValidMessage = await Message.findOne({
                    conversationId: message.conversationId,
                    isRevoked: false,
                    deletedBy: { $ne: userId }, // Loại bỏ tin nhắn đã bị xóa
                }).sort({ createdAt: -1 });

                conversation.lastMessage = lastValidMessage ? lastValidMessage._id : null;
                conversation.updatedAt = new Date();
                await conversation.save();
            }

            // Emit sự kiện thu hồi tin nhắn
            io.to(message.conversationId.toString()).emit('messageRevoked', {
                messageId: message._id,
            });

            // Emit cập nhật cuộc trò chuyện
            io.to(message.conversationId.toString()).emit('conversationUpdated', {
                conversationId: message.conversationId,
                lastMessage: conversation.lastMessage,
                updatedAt: conversation.updatedAt,
            });

        } catch (error) {
            errorHandler(socket, 'Failed to revoke message', error);
        }
    }
};
