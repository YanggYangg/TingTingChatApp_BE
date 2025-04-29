const { Server } = require("socket.io");
const socketService = require("./socketService");
const logger = require("../../utils/logger");
const { handleConnection } = require("./handlers/connection");
const {
  handleJoinConversation,
  handleLeaveConversation,
  handleLoadConversations,
} = require("./handlers/conversation");
const {
  handleSendMessage,
  handleDeleteMessage,
  handleRevokeMessage,
} = require("./handlers/messaging");
const { handleTyping, handleStopTyping } = require("./handlers/typing");
const { handleReadMessage } = require("./handlers/readStatus");
const {
  handleInitiateCall,
  handleAnswerCall,
  handleEndCall,
} = require("./handlers/call");
const socketConfig = require("../../configs/socketConfig");

let io; // Khai báo biến io ở đây để có thể sử dụng trong các hàm khác

module.exports = {
  initializeSocket(server) {
    io = new Server(server, socketConfig);
    socketService.init(io);

    io.on("connection", (socket) => {
      logger.info(`Client connected: ${socket.id}`);
      handleConnection(socket, io);

      // Biến để lưu trữ conversationIds cho mỗi user
      const userConversations = {};

      socket.on("joinConversation", (data) => {
        if (!data.conversationId) {
          return logger.error("Invalid conversation ID provided on join");
        }
        if (!userConversations[socket.handshake.query.userId]) {
          userConversations[socket.handshake.query.userId] = [];
        }
        userConversations[socket.handshake.query.userId].push(
          data.conversationId
        );
        handleJoinConversation(socket, data, socket.handshake.query.userId);
      });

      socket.on("leaveConversation", (data) => {
        if (!data.conversationId) {
          return logger.error("Invalid conversation ID provided on leave");
        }
        handleLeaveConversation(socket, data, socket.handshake.query.userId);
      });

      socket.on("sendMessage", (data) => {
        console.log("sendMessage", data);
        if (!data.conversationId || !data.message) {
          return logger.error("Invalid message data provided");
        }
        handleSendMessage(socket, data, socket.handshake.query.userId, io);
      });

      socket.on("typing", (data) => {
        if (!data.conversationId || !socket.handshake.query.userId) {
          return logger.error("Invalid typing data");
        }
        handleTyping(socket, data, socket.handshake.query.userId);
      });

      socket.on("stopTyping", (data) => {
        if (!data.conversationId || !socket.handshake.query.userId) {
          return logger.error("Invalid stop typing data");
        }
        handleStopTyping(socket, data, socket.handshake.query.userId);
      });

      socket.on("readMessage", (data) => {
        if (
          !data.conversationId ||
          !data.messageId ||
          !socket.handshake.query.userId
        ) {
          return logger.error("Invalid read message data");
        }
        handleReadMessage(socket, data, socket.handshake.query.userId, io);
      });

      socket.on("initiateCall", (data) => {
        if (
          !data.conversationId ||
          !data.callerId ||
          !data.receiverId ||
          !data.callType
        ) {
          console.error("Invalid call initiation data:", data);
          return logger.error("Invalid call initiation data");
        }
        handleInitiateCall(socket, data, io);
      });

      socket.on("answerCall", (data) => {
        if (!data.callId) {
          return logger.error("Invalid call answer data");
        }
        handleAnswerCall(socket, data, socket.handshake.query.userId, io);
      });

      socket.on("endCall", (data) => {
        if (!data.callId || !data.reason) {
          return logger.error("Invalid call end data");
        }
        handleEndCall(socket, data, socket.handshake.query.userId, io);
      });

      socket.on("disconnect", () => {
        logger.info(`Client disconnected: ${socket.id}`);
        const userId = socket.handshake.query.userId;
        const conversationIds = userConversations[userId] || [];

        conversationIds.forEach((conversationId) => {
          handleLeaveConversation(socket, { conversationId }, userId);
        });

        delete userConversations[userId];
      });

      socket.on("loadConversations", async () => {
        const userId = socket.handshake.query.userId;
        if (!userId) {
          return logger.error("Invalid user ID provided on loadConversations");
        }
        await handleLoadConversations(socket, userId);
      });

      socket.on("messageDeleted", (data) => {
        if (!data.messageId) {
          return logger.error("Invalid message ID provided on delete");
        }
        handleDeleteMessage(socket, data, socket.handshake.query.userId, io);
      });

      socket.on("messageRevoked", (data) => {
        if (!data.messageId) {
          return logger.error("Invalid message ID provided on revoke");
        }
        handleRevokeMessage(socket, data, socket.handshake.query.userId, io);
      });
    });

    return io;
  },

  // Nhi thêm để truyền io vào controller // Sử dụng ioInstance đã được lưu trữ
  getIo() {
    if (!io) {
      throw new Error('Socket.IO not initialized');
    }
    return io;
  },
};
