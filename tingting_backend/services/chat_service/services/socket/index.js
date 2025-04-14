// socket/index.js
const { Server } = require('socket.io');
const socketService = require('./socketService');
const logger = require('../../utils/logger');
const { handleConnection } = require('./handlers/connection')
const { handleJoinConversation, handleLeaveConversation, handleLoadConversations } = require('./handlers/conversation');
const { handleSendMessage } = require('./handlers/messaging');
const { handleTyping, handleStopTyping } = require('./handlers/typing');
const { handleReadMessage } = require('./handlers/readStatus');
const socketConfig = require('../../configs/socketConfig');

module.exports = {
    initializeSocket(server) {

        const io = new Server(server, socketConfig);
        socketService.init(io);

        io.on('connection', (socket) => {
            logger.info(`Client connected: ${socket.id}`);
            handleConnection(socket, io);

            socket.on('joinConversation', (data) =>
                handleJoinConversation(socket, data, socket.handshake.query.userId)
            );
            socket.on('leaveConversation', (data) =>
                handleLeaveConversation(socket, data, socket.handshake.query.userId)
            );
            socket.on('sendMessage', (data) =>
                handleSendMessage(socket, data, socket.handshake.query.userId, io)
            );
            socket.on('typing', (data) =>
                handleTyping(socket, data, socket.handshake.query.userId)
            );
            socket.on('stopTyping', (data) =>
                handleStopTyping(socket, data, socket.handshake.query.userId)
            );
            socket.on('readMessage', (data) =>
                handleReadMessage(socket, data, socket.handshake.query.userId, io)
            );
            socket.on('disconnect', () => {
                logger.info(`Client disconnected: ${socket.id}`);
                handleLeaveConversation(socket, {}, socket.handshake.query.userId);
            });
            socket.on('loadConversations', async () => {
                const userId = socket.handshake.query.userId;
                await handleLoadConversations(socket, userId);
            });




        });

        return io;
    },
};