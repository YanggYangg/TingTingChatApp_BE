// src/services/socket/socketService.js
const logger = require('../../utils/logger');
const { getUserSocketMap } = require('./handlers/connection');
const { getUserConversations } = require('./handlers/conversation');

let io;

module.exports = {
    init(socketIO) {
        io = socketIO;
    },

    getIO() {
        if (!io) {
            throw new Error('Socket.io not initialized!');
        }
        return io;
    },

    getReceiverSocketId(userId) {
        return getUserSocketMap()[userId];
    },

    getUserConversations(userId) {
        return getUserConversations(userId);
    },

    emitToUser(userId, event, data) {
        const socketId = getUserSocketMap()[userId];
        if (socketId && io) {
            io.to(socketId).emit(event, data);
        }
    },

    emitToConversation(conversationId, event, data) {
        if (io) {
            io.to(conversationId).emit(event, data);
        }
    },

    emitToAll(event, data) {
        if (io) {
            io.emit(event, data);
        }
    },

    isUserOnline(userId) {
        return !!getUserSocketMap()[userId];
    },

    getOnlineUsers() {
        return Object.keys(getUserSocketMap());
    },

    async handleMessage(message, conversation) {
        if (!io) return;

        this.emitToConversation(conversation._id, 'receiveMessage', message);

        const offlineUsers = conversation.participants.filter(
            (participantId) => !this.isUserOnline(participantId) && participantId !== message.userId
        );

        return offlineUsers;
    },
};