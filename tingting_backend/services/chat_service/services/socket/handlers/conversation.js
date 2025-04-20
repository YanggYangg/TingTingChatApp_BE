// src/services/socket/handlers/conversation.js
const Message = require('../../../models/Message');
const Conversation = require('../../../models/Conversation');
const logger = require('../../../utils/logger');
const errorHandler = require('../../../utils/errorHandler');

const userConversationMap = {};

module.exports = {
    // load all conversation for user
    async handleLoadConversations(socket, userId) {
        if (!userId) {
            return errorHandler(socket, 'Invalid user ID');
        }

        try {
            const conversations = await Conversation.find({ 'participants.userId': userId })
                .populate('participants.userId', 'name avatar') // Populate thông tin user (name, avatar)
                .populate('lastMessage', 'content messageType createdAt userId') // Populate tin nhắn cuối cùng
                .sort({ updateAt: -1 }) // Sắp xếp theo thời gian cập nhật, mới nhất trước
                .lean(); // Chuyển thành plain JavaScript object để tối ưu hiệu suất

            // Gửi danh sách cuộc trò chuyện về client
            socket.emit('loadConversations', conversations);

            
            logger.info(`Loaded ${conversations.length} conversations for user ${userId} detail ${JSON.stringify(conversations)}`);
        } catch (error) {
            errorHandler(socket, 'Failed to load conversations', error);
        }
    },
    async handleJoinConversation(socket, { conversationId }, userId) {
        if (!conversationId) {
            return errorHandler(socket, 'Invalid conversation ID');
        }
        socket.join(conversationId);

        if (userId) {
            if (!userConversationMap[userId]) {
                userConversationMap[userId] = [];
            }
            if (!userConversationMap[userId].includes(conversationId)) {
                userConversationMap[userId].push(conversationId);
            }
        }

        try {
            const messages = await Message.find({ conversationId })
                .sort({ createdAt: -1 })
                .limit(50)
                .lean();
            socket.emit('loadMessages', messages.reverse());
            logger.info(`Loaded ${messages.length} messages for conversation ${conversationId}`);
            socket.emit('joined', { conversationId });
        } catch (error) {
            errorHandler(socket, 'Failed to load messages', error);
        }
    },

    handleLeaveConversation(socket, { conversationId }, userId) {
        if (!conversationId) {
            return errorHandler(socket, 'Invalid conversation ID');
        }
        socket.leave(conversationId);

        if (userId && userConversationMap[userId]) {
            userConversationMap[userId] = userConversationMap[userId].filter(
                (id) => id !== conversationId
            );
        }

        logger.info(`User ${userId} left conversation ${conversationId}`);
        socket.emit('left', { conversationId });
    },

    getUserConversations(userId) {
        return userConversationMap[userId] || [];
    },
};