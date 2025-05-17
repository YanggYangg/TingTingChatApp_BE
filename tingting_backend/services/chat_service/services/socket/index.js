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
  handleUpdateGroupImage,
  handleAddParticipant,
  handleRemoveParticipant,
  // handleChangeParticipantRole,
  handleTransferGroupAdmin,
  handleGetChatMedia,
  handleGetChatFiles,
  handleGetChatLinks,
  handleGetChatStorage,
  handlePinChat,
  handleUpdateNotification,
  handleHideChat,
  handleDeleteAllChatHistory,
  handleGetCommonGroups,
  handleFindMessages,
  deleteMessageChatInfo,
  handleForwardMessage,
  handleLeaveGroup,
  handleDisbandGroup,
  handleVerifyPin
} = require("./handlers/chatInfoSocket");
const socketConfig = require("../../configs/socketConfig");

module.exports = {
  initializeSocket(server) {
    const io = new Server(server, socketConfig);
    socketService.init(io);

    io.on("connection", (socket) => {
      logger.info(`Client connected: ${socket.id}`);

      // Đăng ký userId từ client
      socket.on("registerUser", ({ userId }) => {
        if (!userId || typeof userId !== "string") {
          socket.emit("error", { message: "Invalid user ID provided" });
          return logger.error(`Invalid user ID provided: ${userId}`);
        }
        socket.handshake.query.userId = userId;
        logger.info(`Registered userId ${userId} for socket ${socket.id}`);
        handleConnection(socket, io);
      });

      const userConversations = {};

      // Join conversation
      socket.on("joinConversation", (data) => {
        if (!data.conversationId) {
          socket.emit("error", { message: "Invalid conversation ID provided on join" });
          return logger.error("Invalid conversation ID provided on join");
        }
        if (!socket.handshake.query.userId) {
          socket.emit("error", { message: "User ID not registered. Please register user first." });
          return logger.error("User ID not registered for joinConversation");
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
        if (!socket.handshake.query.userId) {
          socket.emit("error", { message: "User ID not registered. Please register user first." });
          return logger.error("User ID not registered for leaveConversation");
        }
        handleLeaveConversation(socket, data, socket.handshake.query.userId);
      });

      // Send message
      socket.on("sendMessage", (data) => {
        if (!data.conversationId || !data.message) {
          socket.emit("error", { message: "Invalid message data provided" });
          return logger.error("Invalid message data provided");
        }
        if (!socket.handshake.query.userId) {
          socket.emit("error", { message: "User ID not registered. Please register user first." });
          return logger.error("User ID not registered for sendMessage");
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
        if (!socket.handshake.query.userId) {
          socket.emit("error", { message: "User ID not registered. Please register user first." });
          return logger.error("User ID not registered for initiateCall");
        }
        handleInitiateCall(socket, data, io);
      });

      socket.on("answerCall", (data) => {
        if (!data.callId) {
          socket.emit("error", { message: "Invalid call answer data" });
          return logger.error("Invalid call answer data");
        }
        if (!socket.handshake.query.userId) {
          socket.emit("error", { message: "User ID not registered. Please register user first." });
          return logger.error("User ID not registered for answerCall");
        }
        handleAnswerCall(socket, data, socket.handshake.query.userId, io);
      });

      socket.on("endCall", (data) => {
        if (!data.callId || !data.reason) {
          socket.emit("error", { message: "Invalid call end data" });
          return logger.error("Invalid call end data");
        }
        if (!socket.handshake.query.userId) {
          socket.emit("error", { message: "User ID not registered. Please register user first." });
          return logger.error("User ID not registered for endCall");
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
        if (!socket.handshake.query.userId) {
          socket.emit("error", { message: "User ID not registered. Please register user first." });
          return logger.error("User ID not registered for messageDeleted");
        }
        handleDeleteMessageMessaging(socket, data, socket.handshake.query.userId, io);
      });

      // Revoke message
      socket.on("messageRevoked", (data) => {
        if (!data.messageId) {
          socket.emit("error", { message: "Invalid message ID provided on revoke" });
          return logger.error("Invalid message ID provided on revoke");
        }
        if (!socket.handshake.query.userId) {
          socket.emit("error", { message: "User ID not registered. Please register user first." });
          return logger.error("User ID not registered for messageRevoked");
        }
        handleRevokeMessage(socket, data, socket.handshake.query.userId, io);
      });

      // Create group conversation
      socket.on("createConversation", (groupData, callback) => {
        console.log("Nhận sự kiện createConversation:", groupData);
        if (!socket.handshake.query.userId) {
          socket.emit("error", { message: "User ID not registered. Please register user first." });
          return logger.error("User ID not registered for createConversation");
        }
        createGroupConversation(socket, groupData, callback);
      });

      // Conversation removed
      socket.on("conversationRemoved", (data) => {
        if (!data.conversationId) {
          socket.emit("error", { message: "Invalid conversation ID provided on conversationRemoved" });
          return logger.error("Invalid conversation ID provided on conversationRemoved");
        }
        if (!socket.handshake.query.userId) {
          socket.emit("error", { message: "User ID not registered. Please register user first." });
          return logger.error("User ID not registered for conversationRemoved");
        }
        handleConversationRemoved(socket, data, socket.handshake.query.userId, io);
      });

      // Chat info events
      socket.on("getChatInfo", (data, callback) => {
        if (!data.conversationId) {
          socket.emit("error", { message: "Invalid conversation ID provided on getChatInfo" });
          return logger.error("Invalid conversation ID provided on getChatInfo");
        }
        if (!socket.handshake.query.userId) {
          socket.emit("error", { message: "User ID not registered. Please register user first." });
          return logger.error("User ID not registered for getChatInfo");
        }
        handleGetChatInfo(socket, data, socket.handshake.query.userId, callback);
      });

      socket.on("updateChatName", (data, callback) => {
        if (!data.conversationId || !data.name) {
          socket.emit("error", { message: "Invalid data provided on updateChatName" });
          return logger.error("Invalid data provided on updateChatName");
        }
        if (!socket.handshake.query.userId) {
          socket.emit("error", { message: "User ID not registered. Please register user first." });
          return logger.error("User ID not registered for updateChatName");
        }
        handleUpdateChatName(socket, data, socket.handshake.query.userId, io, callback);
      });

      socket.on("updateGroupImage", (data, callback) => {
        if (!data.conversationId || !data.imageUrl) {
          socket.emit("error", { message: "Invalid data provided on updateGroupImage" });
          return logger.error("Invalid data provided on updateGroupImage");
        }
        if (!socket.handshake.query.userId) {
          socket.emit("error", { message: "User ID not registered. Please register user first." });
          return logger.error("User ID not registered for updateGroupImage");
        }
        handleUpdateGroupImage(socket, data, socket.handshake.query.userId, io, callback);
      });

      socket.on("addParticipant", async (data, callback) => {
        if (!data.conversationId || !data.userId) {
          socket.emit("error", { message: "Invalid conversation ID or user ID provided" });
          return logger.error("Invalid conversation ID or user ID provided on addParticipant");
        }
        if (!socket.handshake.query.userId) {
          socket.emit("error", { message: "User ID not registered. Please register user first." });
          return logger.error("User ID not registered for addParticipant");
        }
        await handleAddParticipant(socket, data, socket.handshake.query.userId, io, callback);
      });

      socket.on("removeParticipant", (data, callback) => {
        if (!data.conversationId || !data.userId) {
          socket.emit("error", { message: "Invalid data provided on removeParticipant" });
          return logger.error("Invalid data provided on removeParticipant");
        }
        if (!socket.handshake.query.userId) {
          socket.emit("error", { message: "User ID not registered. Please register user first." });
          return logger.error("User ID not registered for removeParticipant");
        }
        handleRemoveParticipant(socket, data, socket.handshake.query.userId, io, callback);
      });

      socket.on("changeParticipantRole", (data, callback) => {
        if (!data.conversationId || !data.userId || !data.role) {
          socket.emit("error", { message: "Invalid data provided on changeParticipantRole" });
          return logger.error("Invalid data provided on changeParticipantRole");
        }
        if (!socket.handshake.query.userId) {
          socket.emit("error", { message: "User ID not registered. Please register user first." });
          return logger.error("User ID not registered for changeParticipantRole");
        }
        handleChangeParticipantRole(socket, data, socket.handshake.query.userId, io, callback);
      });

      socket.on("transferGroupAdmin", (data, callback) => {
        if (!data.conversationId || !data.userId) {
          socket.emit("error", { message: "Invalid data provided on transferGroupAdmin" });
          return logger.error("Invalid data provided on transferGroupAdmin");
        }
        if (!socket.handshake.query.userId) {
          socket.emit("error", { message: "User ID not registered. Please register user first." });
          return logger.error("User ID not registered for transferGroupAdmin");
        }
        handleTransferGroupAdmin(socket, data, socket.handshake.query.userId, io, callback);
      });

      socket.on("getChatMedia", (data, callback) => {
        if (!data.conversationId) {
          socket.emit("error", { message: "Invalid conversation ID provided on getChatMedia" });
          return logger.error("Invalid conversation ID provided on getChatMedia");
        }
        if (!socket.handshake.query.userId) {
          socket.emit("error", { message: "User ID not registered. Please register user first." });
          return logger.error("User ID not registered for getChatMedia");
        }
        handleGetChatMedia(socket, data, socket.handshake.query.userId, callback);
      });

      socket.on("getChatFiles", (data, callback) => {
        if (!data.conversationId) {
          socket.emit("error", { message: "Invalid conversation ID provided on getChatFiles" });
          return logger.error("Invalid conversation ID provided on getChatFiles");
        }
        if (!socket.handshake.query.userId) {
          socket.emit("error", { message: "User ID not registered. Please register user first." });
          return logger.error("User ID not registered for getChatFiles");
        }
        handleGetChatFiles(socket, data, socket.handshake.query.userId, callback);
      });

      socket.on("getChatLinks", (data, callback) => {
        if (!data.conversationId) {
          socket.emit("error", { message: "Invalid conversation ID provided on getChatLinks" });
          return logger.error("Invalid conversation ID provided on getChatLinks");
        }
        if (!socket.handshake.query.userId) {
          socket.emit("error", { message: "User ID not registered. Please register user first." });
          return logger.error("User ID not registered for getChatLinks");
        }
        handleGetChatLinks(socket, data, socket.handshake.query.userId, callback);
      });

      socket.on("getChatStorage", (data, callback) => {
        if (!data.conversationId) {
          socket.emit("error", { message: "Invalid conversation ID provided on getChatStorage" });
          return logger.error("Invalid conversation ID provided on getChatStorage");
        }
        if (!socket.handshake.query.userId) {
          socket.emit("error", { message: "User ID not registered. Please register user first." });
          return logger.error("User ID not registered for getChatStorage");
        }
        handleGetChatStorage(socket, data, socket.handshake.query.userId, callback);
      });

      socket.on("pinChat", (data, callback) => {
        if (!data.conversationId || typeof data.isPinned === "undefined") {
          socket.emit("error", { message: "Invalid data provided on pinChat" });
          return logger.error("Invalid data provided on pinChat");
        }
        if (!socket.handshake.query.userId) {
          socket.emit("error", { message: "User ID not registered. Please register user first." });
          return logger.error("User ID not registered for pinChat");
        }
        handlePinChat(socket, data, socket.handshake.query.userId, io, callback);
      });

      socket.on("updateNotification", (data, callback) => {
        if (!data.conversationId) {
          socket.emit("error", { message: "Invalid data provided on updateNotification" });
          return logger.error("Invalid data provided on updateNotification");
        }
        if (!socket.handshake.query.userId) {
          socket.emit("error", { message: "User ID not registered. Please register user first." });
          return logger.error("User ID not registered for updateNotification");
        }
        handleUpdateNotification(socket, data, socket.handshake.query.userId, io, callback);
      });

      socket.on("hideChat", (data, callback) => {
        if (!data.conversationId) {
          socket.emit("error", { message: "Invalid conversation ID provided on hideChat" });
          return logger.error("Invalid conversation ID provided on hideChat");
        }
        if (!socket.handshake.query.userId) {
          socket.emit("error", { message: "User ID not registered. Please register user first." });
          return logger.error("User ID not registered for hideChat");
        }
        handleHideChat(socket, data, socket.handshake.query.userId, io, callback);
      });

      socket.on("getCommonGroups", (data, callback) => {
        if (!data.conversationId) {
          socket.emit("error", { message: "Invalid conversation ID provided on getCommonGroups" });
          return logger.error("Invalid conversation ID provided on getCommonGroups");
        }
        if (!socket.handshake.query.userId) {
          socket.emit("error", { message: "User ID not registered. Please register user first." });
          return logger.error("User ID not registered for getCommonGroups");
        }
        handleGetCommonGroups(socket, data, socket.handshake.query.userId, callback);
      });

      socket.on("findMessages", (data, callback) => {
        if (!data.conversationId || !data.query) {
          socket.emit("error", { message: "Invalid data provided on findMessages" });
          return logger.error("Invalid data provided on findMessages");
        }
        if (!socket.handshake.query.userId) {
          socket.emit("error", { message: "User ID not registered. Please register user first." });
          return logger.error("User ID not registered for findMessages");
        }
        handleFindMessages(socket, data, socket.handshake.query.userId, callback);
      });

      socket.on("deleteMessageChatInfo", (data, callback) => {
        if (!data.messageId) {
          socket.emit("error", { message: "Invalid message ID provided on deleteMessageChatInfo" });
          return logger.error("Invalid message ID provided on deleteMessageChatInfo");
        }
        if (!socket.handshake.query.userId) {
          socket.emit("error", { message: "User ID not registered. Please register user first." });
          return logger.error("User ID not registered for deleteMessageChatInfo");
        }
        deleteMessageChatInfo(socket, data, socket.handshake.query.userId, io, callback);
      });

      socket.on("forwardMessage", (data, callback) => {
        if (!data.messageId || !data.targetConversationIds || !data.userId) {
          socket.emit("error", { message: "Invalid data provided on forwardMessage" });
          return logger.error("Invalid data provided on forwardMessage");
        }
        if (!socket.handshake.query.userId) {
          socket.emit("error", { message: "User ID not registered. Please register user first." });
          return logger.error("User ID not registered for forwardMessage");
        }
        handleForwardMessage(socket, data, socket.handshake.query.userId, io, callback);
      });

      socket.on("leaveGroup", (data, callback) => {
        if (!data.conversationId) {
          socket.emit("error", { message: "Invalid conversation ID provided on leaveGroup" });
          return logger.error("Invalid conversation ID provided on leaveGroup");
        }
        if (!socket.handshake.query.userId) {
          socket.emit("error", { message: "User ID not registered. Please register user first." });
          return logger.error("User ID not registered for leaveGroup");
        }
        handleLeaveGroup(socket, data, io, callback);
      });

      socket.on("deleteAllChatHistory", (data, callback) => {
        if (!data.conversationId) {
          socket.emit("error", { message: "Invalid conversation ID provided on deleteAllChatHistory" });
          return logger.error("Invalid conversation ID provided on deleteAllChatHistory");
        }
        if (!socket.handshake.query.userId) {
          socket.emit("error", { message: "User ID not registered. Please register user first." });
          return logger.error("User ID not registered for deleteAllChatHistory");
        }
        handleDeleteAllChatHistory(socket, data, socket.handshake.query.userId, io, callback);
      });

      socket.on("disbandGroup", (data, callback) => {
        if (!data.conversationId) {
          socket.emit("error", { message: "Invalid conversation ID provided on disbandGroup" });
          return logger.error("Invalid conversation ID provided on disbandGroup");
        }
        if (!socket.handshake.query.userId) {
          socket.emit("error", { message: "User ID not registered. Please register user first." });
          return logger.error("User ID not registered for disbandGroup");
        }
        handleDisbandGroup(socket, data, socket.handshake.query.userId, io, callback);
      });

      socket.on("verifyPin", async (payload, callback) => {
        if (!socket.handshake.query.userId) {
          socket.emit("error", { message: "User ID not registered. Please register user first." });
          return logger.error("User ID not registered for verifyPin");
        }
        await handleVerifyPin(socket, payload, callback);
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
    });
  },
};