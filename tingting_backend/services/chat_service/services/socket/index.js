const { Server } = require("socket.io");
const socketService = require("./socketService");
const logger = require("../../utils/logger");
const { handleConnection } = require("./handlers/connection");
const {
  handleJoinConversation,
  handleLeaveConversation,
  handleLoadConversations,
  createGroupConversation,
  handleConversationRemoved,
} = require("./handlers/conversation");
const {
  handleSendMessage,
  handleDeleteMessage: handleDeleteMessageMessaging,
  handleRevokeMessage,
} = require("./handlers/messaging");
const { handleTyping, handleStopTyping } = require("./handlers/typing");
const { handleReadMessage } = require("./handlers/readStatus");
const {
  handleInitiateCall,
  handleAnswerCall,
  handleEndCall,
} = require("./handlers/call");
const {
  handleGetChatInfo,
  handleUpdateChatName,
  handleAddParticipant,
  handleRemoveParticipant,
  handleChangeParticipantRole,
  handleTransferGroupAdmin,
  handleGetChatMedia,
  handleGetChatFiles,
  handleGetChatLinks,
  handleGetChatStorage,
  handlePinChat,
  handleUpdateNotification,
  handleHideChat,
  handleDeleteChatHistoryForMe,
  handleGetCommonGroups,
  handleFindMessages,
  deleteMessageChatInfo,
  handleForwardMessage,
  handleLeaveGroup,
  handleDisbandGroup
} = require("./handlers/chatInfoSocket");
const socketConfig = require("../../configs/socketConfig");

module.exports = {
  initializeSocket(server) {
    const io = new Server(server, socketConfig);
    socketService.init(io);

    io.on("connection", (socket) => {
      logger.info(`Client connected: ${socket.id}`);
      handleConnection(socket, io);

      const userConversations = {};

      // Join conversation
      socket.on("joinConversation", (data) => {
        if (!data.conversationId) {
          socket.emit("error", { message: "Invalid conversation ID provided on join" });
          return logger.error("Invalid conversation ID provided on join");
        }
        if (!userConversations[socket.handshake.query.userId]) {
          userConversations[socket.handshake.query.userId] = [];
        }
        userConversations[socket.handshake.query.userId].push(data.conversationId);
        handleJoinConversation(socket, data, socket.handshake.query.userId);
      });

      // Leave conversation
      socket.on("leaveConversation", (data) => {
        if (!data.conversationId) {
          socket.emit("error", { message: "Invalid conversation ID provided on leave" });
          return logger.error("Invalid conversation ID provided on leave");
        }
        handleLeaveConversation(socket, data, socket.handshake.query.userId);
      });

      // Send message
      socket.on("sendMessage", (data) => {
        if (!data.conversationId || !data.message) {
          socket.emit("error", { message: "Invalid message data provided" });
          return logger.error("Invalid message data provided");
        }
        handleSendMessage(socket, data, socket.handshake.query.userId, io);
      });

      // Typing events
      socket.on("typing", (data) => {
        if (!data.conversationId || !socket.handshake.query.userId) {
          socket.emit("error", { message: "Invalid typing data" });
          return logger.error("Invalid typing data");
        }
        handleTyping(socket, data, socket.handshake.query.userId);
      });

      socket.on("stopTyping", (data) => {
        if (!data.conversationId || !socket.handshake.query.userId) {
          socket.emit("error", { message: "Invalid stop typing data" });
          return logger.error("Invalid stop typing data");
        }
        handleStopTyping(socket, data, socket.handshake.query.userId);
      });

      // Read message
      socket.on("readMessage", (data) => {
        if (!data.conversationId || !data.messageId || !socket.handshake.query.userId) {
          socket.emit("error", { message: "Invalid read message data" });
          return logger.error("Invalid read message data");
        }
        handleReadMessage(socket, data, socket.handshake.query.userId, io);
      });

      // Call events
      socket.on("initiateCall", (data) => {
        if (!data.conversationId || !data.callerId || !data.receiverId || !data.callType) {
          socket.emit("error", { message: "Invalid call initiation data" });
          return logger.error("Invalid call initiation data");
        }
        handleInitiateCall(socket, data, io);
      });

      socket.on("answerCall", (data) => {
        if (!data.callId) {
          socket.emit("error", { message: "Invalid call answer data" });
          return logger.error("Invalid call answer data");
        }
        handleAnswerCall(socket, data, socket.handshake.query.userId, io);
      });

      socket.on("endCall", (data) => {
        if (!data.callId || !data.reason) {
          socket.emit("error", { message: "Invalid call end data" });
          return logger.error("Invalid call end data");
        }
        handleEndCall(socket, data, socket.handshake.query.userId, io);
      });

      // Load conversations
      socket.on("loadConversations", async () => {
        const userId = socket.handshake.query.userId;
        if (!userId) {
          socket.emit("error", { message: "Invalid user ID provided on loadConversations" });
          return logger.error("Invalid user ID provided on loadConversations");
        }
        await handleLoadConversations(socket, userId);
      });

      // Delete message (from messaging handler)
      socket.on("messageDeleted", (data) => {
        if (!data.messageId) {
          socket.emit("error", { message: "Invalid message ID provided on delete" });
          return logger.error("Invalid message ID provided on delete");
        }
        handleDeleteMessageMessaging(socket, data, socket.handshake.query.userId, io);
      });

      // Revoke message
      socket.on("messageRevoked", (data) => {
        if (!data.messageId) {
          socket.emit("error", { message: "Invalid message ID provided on revoke" });
          return logger.error("Invalid message ID provided on revoke");
        }
        handleRevokeMessage(socket, data, socket.handshake.query.userId, io);
      });

      // Create group conversation
      socket.on("createConversation", (groupData, callback) => {
        console.log("Nhận sự kiện createConversation:", groupData); // Log để debug
        createGroupConversation(socket, groupData, callback);
      });

      // Conversation removed
      socket.on("conversationRemoved", (data) => {
        if (!data.conversationId) {
          socket.emit("error", { message: "Invalid conversation ID provided on conversationRemoved" });
          return logger.error("Invalid conversation ID provided on conversationRemoved");
        }
        handleConversationRemoved(socket, data, socket.handshake.query.userId, io);
      });
      // Chat info events
      socket.on("getChatInfo", (data, callback) => {
        if (!data.conversationId) {
          socket.emit("error", { message: "Invalid conversation ID provided on getChatInfo" });
          return logger.error("Invalid conversation ID provided on getChatInfo");
        }
        handleGetChatInfo(socket, data, socket.handshake.query.userId, callback);
      });

      socket.on("updateChatName", (data, callback) => {
        if (!data.conversationId || !data.name) {
          socket.emit("error", { message: "Invalid data provided on updateChatName" });
          return logger.error("Invalid data provided on updateChatName");
        }
        handleUpdateChatName(socket, data, socket.handshake.query.userId, io, callback);
      });

      // Đăng ký sự kiện trong socket
      socket.on("addParticipant", async (data, callback) => {
        if (!data.conversationId || !data.userId) {
          socket.emit("error", { message: "Invalid conversation ID or user ID provided" });
          return logger.error("Invalid conversation ID or user ID provided on addParticipant");
        }
        await handleAddParticipant(socket, data, io, callback);
      });

      socket.on("removeParticipant", (data, callback) => {
        if (!data.conversationId || !data.userId) {
          socket.emit("error", { message: "Invalid data provided on removeParticipant" });
          return logger.error("Invalid data provided on removeParticipant");
        }
        handleRemoveParticipant(socket, data, socket.handshake.query.userId, io, callback);
      });

      socket.on("changeParticipantRole", (data, callback) => {
        if (!data.conversationId || !data.userId || !data.role) {
          socket.emit("error", { message: "Invalid data provided on changeParticipantRole" });
          return logger.error("Invalid data provided on changeParticipantRole");
        }
        handleChangeParticipantRole(socket, data, socket.handshake.query.userId, io, callback);
      });

      socket.on("transferGroupAdmin", (data, callback) => {
        if (!data.conversationId || !data.userId) {
          socket.emit("error", { message: "Invalid data provided on transferGroupAdmin" });
          return logger.error("Invalid data provided on transferGroupAdmin");
        }
        handleTransferGroupAdmin(socket, data, socket.handshake.query.userId, io, callback);
      });

      socket.on("getChatMedia", (data, callback) => {
        if (!data.conversationId) {
          socket.emit("error", { message: "Invalid conversation ID provided on getChatMedia" });
          return logger.error("Invalid conversation ID provided on getChatMedia");
        }
        handleGetChatMedia(socket, data, socket.handshake.query.userId, callback);
      });

      socket.on("getChatFiles", (data, callback) => {
        if (!data.conversationId) {
          socket.emit("error", { message: "Invalid conversation ID provided on getChatFiles" });
          return logger.error("Invalid conversation ID provided on getChatFiles");
        }
        handleGetChatFiles(socket, data, socket.handshake.query.userId, callback);
      });

      socket.on("getChatLinks", (data, callback) => {
        if (!data.conversationId) {
          socket.emit("error", { message: "Invalid conversation ID provided on getChatLinks" });
          return logger.error("Invalid conversation ID provided on getChatLinks");
        }
        handleGetChatLinks(socket, data, socket.handshake.query.userId, callback);
      });

      socket.on("getChatStorage", (data, callback) => {
        if (!data.conversationId) {
          socket.emit("error", { message: "Invalid conversation ID provided on getChatStorage" });
          return logger.error("Invalid conversation ID provided on getChatStorage");
        }
        handleGetChatStorage(socket, data, socket.handshake.query.userId, callback);
      });

      socket.on("pinChat", (data, callback) => {
        if (!data.conversationId || typeof data.isPinned === "undefined") {
          socket.emit("error", { message: "Invalid data provided on pinChat" });
          return logger.error("Invalid data provided on pinChat");
        }
        handlePinChat(socket, data, socket.handshake.query.userId, io, callback);
      });

      socket.on("updateNotification", (data, callback) => {
        if (!data.conversationId) {
          socket.emit("error", { message: "Invalid data provided on updateNotification" });
          return logger.error("Invalid data provided on updateNotification");
        }
        handleUpdateNotification(socket, data, socket.handshake.query.userId, io, callback);
      });

      socket.on("hideChat", (data, callback) => {
        if (!data.conversationId) {
          socket.emit("error", { message: "Invalid conversation ID provided on hideChat" });
          return logger.error("Invalid conversation ID provided on hideChat");
        }
        handleHideChat(socket, data, socket.handshake.query.userId, io, callback);
      });

      socket.on("deleteChatHistoryForMe", (data, callback) => {
        if (!data.conversationId) {
          socket.emit("error", { message: "Invalid conversation ID provided on deleteChatHistoryForMe" });
          return logger.error("Invalid conversation ID provided on deleteChatHistoryForMe");
        }
        handleDeleteChatHistoryForMe(socket, data, socket.handshake.query.userId, io, callback);
      });

      socket.on("getCommonGroups", (data, callback) => {
        if (!data.conversationId) {
          socket.emit("error", { message: "Invalid conversation ID provided on getCommonGroups" });
          return logger.error("Invalid conversation ID provided on getCommonGroups");
        }
        handleGetCommonGroups(socket, data, socket.handshake.query.userId, callback);
      });

      socket.on("findMessages", (data, callback) => {
        if (!data.conversationId || !data.query) {
          socket.emit("error", { message: "Invalid data provided on findMessages" });
          return logger.error("Invalid data provided on findMessages");
        }
        handleFindMessages(socket, data, socket.handshake.query.userId, callback);
      });

      // Delete message (from chatInfoSocket handler)
      // In the io.on("connection", (socket) => {...}) block
      socket.on("deleteMessageChatInfo", (data, callback) => {
        if (!data.messageId) {
          socket.emit("error", { message: "Invalid message ID provided on deleteMessageChatInfo" });
          return logger.error("Invalid message ID provided on deleteMessageChatInfo");
        }
        deleteMessageChatInfo(socket, data, socket.handshake.query.userId, io, callback);
      });

      // Forward message
      socket.on("forwardMessage", (data, callback) => {
        if (!data.messageId || !data.targetConversationIds || !data.userId) {
          socket.emit("error", { message: "Invalid data provided on forwardMessage" });
          return logger.error("Invalid data provided on forwardMessage");
        }
        handleForwardMessage(socket, data, socket.handshake.query.userId, io, callback);
      });

      // leave group conversation
      socket.on("leaveGroupSuccess", (data, callback) => {
        if (!data.conversationId) {
          socket.emit("error", { message: "Invalid conversation ID provided on leaveGroup" });
          return logger.error("Invalid conversation ID provided on leaveGroup");
        }
        handleLeaveGroup(socket, data, socket.handshake.query.userId, io, callback);
      });
      // Handle disconnect
      socket.on("disconnect", () => {
        logger.info(`Client disconnected: ${socket.id}`);
        const userId = socket.handshake.query.userId;
        const conversationIds = userConversations[userId] || [];

        conversationIds.forEach((conversationId) => {
          handleLeaveConversation(socket, { conversationId }, userId);
        });

        delete userConversations[userId];
      });
      socket.on("disbandGroup", (data, callback) => {
        if (!data.conversationId) {
          socket.emit("error", { message: "Invalid conversation ID provided on disbandGroup" });
          return logger.error("Invalid conversation ID provided on disbandGroup");
        }
        handleDisbandGroup(socket, data, socket.handshake.query.userId, io, callback);
      });
    });
  },
};