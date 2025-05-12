// src/services/socket/handlers/conversation.js
const Message = require("../../../models/Message");
const Conversation = require("../../../models/Conversation");
const logger = require("../../../utils/logger");
const errorHandler = require("../../../utils/errorHandler");

const userConversationMap = {};

module.exports = {
  // load all conversation for user
  async handleLoadConversations(socket, userId) {
    if (!userId) {
      return errorHandler(socket, "Invalid user ID");
    }

    try {
      const conversations = await Conversation.find({
        "participants.userId": userId,
      })
        .populate("participants.userId", "name avatar") // Populate thông tin user (name, avatar)
        .populate("lastMessage", "content messageType createdAt userId") // Populate tin nhắn cuối cùng
        .sort({ updateAt: -1 }) // Sắp xếp theo thời gian cập nhật, mới nhất trước
        .lean(); // Chuyển thành plain JavaScript object để tối ưu hiệu suất

      // Gửi danh sách cuộc trò chuyện về client
      socket.emit("loadConversations", conversations);

      // logger.info(`Loaded ${conversations.length} conversations for user ${userId} detail ${JSON.stringify(conversations)}`);
    } catch (error) {
      errorHandler(socket, "Failed to load conversations", error);
    }
  },
  async handleJoinConversation(socket, { conversationId }, userId) {
    if (!conversationId) {
      return errorHandler(socket, "Invalid conversation ID");
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
      socket.emit("loadMessages", messages.reverse());
      // logger.info(
      //   `Loaded ${messages.length} messages for conversation ${conversationId}`
      // );
      socket.emit("joined", { conversationId });
    } catch (error) {
      errorHandler(socket, "Failed to load messages", error);
    }
  },

  handleLeaveConversation(socket, { conversationId }, userId) {
    if (!conversationId) {
      return errorHandler(socket, "Invalid conversation ID");
    }
    socket.leave(conversationId);

    if (userId && userConversationMap[userId]) {
      userConversationMap[userId] = userConversationMap[userId].filter(
        (id) => id !== conversationId
      );
    }

    logger.info(`User ${userId} left conversation ${conversationId}`);
    socket.emit("left", { conversationId });
  },

  getUserConversations(userId) {
    return userConversationMap[userId] || [];
  },
  async createGroupConversation  (socket, groupData, callback)  {
    try {
      // Kiểm tra dữ liệu đầu vào
      if (!groupData) {
        throw new Error("Dữ liệu nhóm không hợp lệ");
      }
  
      const { name, participants, isGroup, imageGroup, mute, isHidden, isPinned, pin } = groupData;
  
      // Kiểm tra các thuộc tính bắt buộc
      if (!name || !participants || !Array.isArray(participants) || participants.length < 2) {
        throw new Error("Tên nhóm hoặc danh sách thành viên không hợp lệ");
      }
  
      // Log để debug
      console.log("Dữ liệu nhóm nhận được:", groupData);
  
      // Tạo cuộc trò chuyện mới
      const newConversation = await Conversation.create({
        name: name.trim() || "Nhóm không tên",
        participants,
        isGroup: isGroup !== undefined ? isGroup : true,
        imageGroup: imageGroup || "https://via.placeholder.com/40?text=Group",
        mute: mute || null,
        isHidden: isHidden || false,
        isPinned: isPinned || false,
        pin: pin || "null",
      });
  
      // Tham gia phòng socket cho người tạo
      const conversationId = newConversation._id.toString();
      socket.join(conversationId);
  
      // Gửi sự kiện newGroupConversation đến tất cả thành viên
      const io = socket.server; // Lấy instance io từ socket
      const participantIds = participants.map((p) => p.userId);
  
      // Tìm tất cả socket của các thành viên
      const sockets = await io.fetchSockets();
      const onlineParticipantSockets = sockets.filter((s) =>
        participantIds.includes(s.handshake.query.userId)
      );
  
      // Log để debug
      console.log("Online participants:", onlineParticipantSockets.map(s => s.handshake.query.userId));
  
      // Emit sự kiện đến từng socket của thành viên
      onlineParticipantSockets.forEach((participantSocket) => {
        participantSocket.emit("newGroupConversation", newConversation);
        // Tham gia room conversationId cho thành viên
        participantSocket.join(conversationId);
      });
  
      // Ghi log
      logger.info(`Created new group conversation ${conversationId}`);
  
      // Gửi phản hồi thành công qua callback
      callback({
        success: true,
        data: newConversation,
      });
    } catch (error) {
      // Ghi log lỗi
      console.error("Error creating group:", error);
      logger.error(`Failed to create group conversation: ${error.message}`);
  
      // Gửi phản hồi lỗi qua callback
      callback({
        success: false,
        message: error.message || "Không thể tạo nhóm",
      });
  
      // Gửi lỗi qua socket
      errorHandler(socket, "Không thể tạo nhóm", error);
    }
  },


  // async createGroupConversation   (socket, groupData, callback) {
  //   try {
  //     if (!groupData) {
  //       throw new Error("Dữ liệu nhóm không hợp lệ");
  //     }
  
  //     const { name, participants, isGroup, imageGroup, mute, isHidden, isPinned, pin } = groupData;
  
  //     if (!name || !participants || !Array.isArray(participants) || participants.length < 2) {
  //       throw new Error("Tên nhóm hoặc danh sách thành viên không hợp lệ");
  //     }
  
  //     console.log("Dữ liệu nhóm nhận được:", groupData);
  
  //     // Kiểm tra nhóm đã tồn tại
  //     const existingConversation = await Conversation.findOne({
  //       name,
  //       participants: { $all: participants.map((p) => p.userId) },
  //       isGroup: true,
  //     });
  //     if (existingConversation) {
  //       console.log("Group already exists:", existingConversation._id);
  //       return callback({
  //         success: false,
  //         message: "Nhóm đã tồn tại",
  //       });
  //     }
  
  //     const newConversation = await Conversation.create({
  //       name: name.trim(),
  //       participants,
  //       isGroup: isGroup !== undefined ? isGroup : true,
  //       imageGroup: imageGroup || "https://via.placeholder.com/40?text=Group",
  //       mute: mute || null,
  //       isHidden: isHidden || false,
  //       isPinned: isPinned || false,
  //       pin: pin || "null",
  //     });
  
  //     const conversationId = newConversation._id.toString();
  //     socket.join(conversationId);
  
  //     const io = socket.server;
  //     const participantIds = participants.map((p) => p.userId);
  //     const sockets = await io.fetchSockets();
  //     const onlineParticipantSockets = sockets.filter((s) =>
  //       participantIds.includes(s.handshake.query.userId)
  //     );
  
  //     console.log("Online participants:", onlineParticipantSockets.map((s) => s.handshake.query.userId));
  
  //     onlineParticipantSockets.forEach((participantSocket) => {
  //       participantSocket.emit("newGroupConversation", newConversation);
  //       participantSocket.join(conversationId);
  //     });
  
  //     logger.info(`Created new group conversation ${conversationId}`);
  
  //     callback({
  //       success: true,
  //       data: newConversation,
  //     });
  //   } catch (error) {
  //     console.error("Error creating group:", error);
  //     logger.error(`Failed to create group conversation: ${error.message}`);
  
  //     callback({
  //       success: false,
  //       message: error.message || "Không thể tạo nhóm",
  //     });
  
  //     errorHandler(socket, "Không thể tạo nhóm", error);
  //   }
  // }

  // Remove a conversation
  async handleConversationRemoved(socket, { conversationId }, userId, io, callback) {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        socket.emit("error", { message: "Conversation not found" });
        return callback && callback({ success: false, message: "Conversation not found" });
      }
  
      // Kiểm tra quyền
      const participant = conversation.participants.find(
        (p) => p.userId.toString() === userId
      );
      if (!participant || (conversation.isGroup && participant.role !== "admin")) {
        socket.emit("error", { message: "You are not authorized to remove this conversation" });
        return callback && callback({ success: false, message: "You are not authorized to remove this conversation" });
      }
  
      // Xóa cuộc trò chuyện và tin nhắn
      await Conversation.findByIdAndDelete(conversationId);
      await Message.deleteMany({ conversationId });
  
      // Thông báo tới tất cả thành viên trong room
      io.to(conversationId).emit("conversationRemoved", { conversationId });
  
      // Thông báo riêng cho từng thành viên online (đề phòng họ chưa join room)
      const participantIds = conversation.participants.map((p) => p.userId.toString());
      const sockets = await io.fetchSockets();
      const onlineParticipants = sockets.filter((s) =>
        participantIds.includes(s.handshake.query.userId)
      );
      onlineParticipants.forEach((participantSocket) => {
        participantSocket.emit("conversationRemoved", { conversationId });
      });
  
      logger.info(`Conversation ${conversationId} removed by user ${userId}`);
      if (callback) {
        callback({ success: true });
      }
    } catch (error) {
      errorHandler(socket, "Failed to remove conversation", error);
      if (callback) {
        callback({ success: false, message: "Failed to remove conversation" });
      }
    }
  }

};
