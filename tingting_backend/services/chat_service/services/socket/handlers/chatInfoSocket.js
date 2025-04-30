const Conversation = require("../../../models/Conversation");
const Message = require("../../../models/Message");
const logger = require("../../../utils/logger");
const errorHandler = require("../../../utils/errorHandler");
const bcrypt = require("bcrypt");

module.exports = {
  // Lấy thông tin nhóm/chat
  async handleGetChatInfo(socket, { conversationId }, userId, callback) {
    try {
      logger.info(`User ${userId} requesting chat info for conversation ${conversationId}`);
      console.log("conversationId từ client:", conversationId);
      console.log("userId từ client:", userId);
      const chat = await Conversation.findById(conversationId)
        .lean(); // Không cần populate vì userId là String
      console.log("Thông tin chat (sau lean):", chat);
  
      if (!chat) {
        socket.emit("error", { message: "Chat not found" });
        return callback && callback({ success: false, message: "Chat not found" });
      }
  
      console.log("Participants trong cuộc trò chuyện:", chat.participants);
  
      const participant = chat.participants.find((p) => {
        // So sánh trực tiếp userId (đã là String)
        console.log("So sánh:", p.userId, "với", userId);
        return p.userId === userId;
      });
  
      if (!participant) {
        socket.emit("error", { message: "User not found in this conversation" });
        return callback && callback({ success: false, message: "User not found in this conversation" });
      }
  
      socket.emit("chatInfo", chat);
      logger.info(`Chat info sent to user ${userId} for conversation ${conversationId}`);
      if (callback) {
        callback({ success: true, data: chat });
      }
    } catch (error) {
      errorHandler(socket, "Failed to get chat info", error);
      console.error("Lỗi chi tiết:", error);
      if (callback) {
        callback({ success: false, message: "Failed to get chat info", error: error.message });
      }
    }
  },
  
  // Cập nhật tên nhóm
  async handleUpdateChatName(socket, { conversationId, name }, userId, io, callback) {
    try {
      logger.info(`User ${userId} requesting to update chat name for conversation ${conversationId}`);
  
      // Kiểm tra tên mới có hợp lệ không
      if (!name || typeof name !== "string" || name.trim() === "") {
        socket.emit("error", { message: "Chat name must be a non-empty string" });
        return callback && callback({ success: false, message: "Chat name must be a non-empty string" });
      }
  
      // Tìm cuộc trò chuyện
      const chat = await Conversation.findById(conversationId).lean();
      if (!chat) {
        socket.emit("error", { message: "Conversation not found" });
        return callback && callback({ success: false, message: "Conversation not found" });
      }
  
      // Kiểm tra xem user có trong cuộc trò chuyện không
      const participant = chat.participants.find((p) => p.userId === userId);
      if (!participant) {
        socket.emit("error", { message: "User not found in this conversation" });
        return callback && callback({ success: false, message: "User not found in this conversation" });
      }
  
      // Bỏ kiểm tra quyền (cho phép bất kỳ ai trong cuộc trò chuyện đổi tên)
      // Trước đây có thể có kiểm tra như: if (participant.role !== "admin") { ... }
  
      // Cập nhật tên nhóm
      const updatedChat = await Conversation.findByIdAndUpdate(
        conversationId,
        { $set: { name: name.trim(), updatedAt: new Date() } },
        { new: true }
      ).lean();
  
      if (!updatedChat) {
        socket.emit("error", { message: "Failed to update chat name" });
        return callback && callback({ success: false, message: "Failed to update chat name" });
      }
  
      // Emit sự kiện cập nhật đến tất cả client trong cuộc trò chuyện
      io.to(conversationId).emit("chatInfoUpdated", {
        conversationId,
        name: updatedChat.name,
        updatedAt: updatedChat.updatedAt,
      });
  
      logger.info(`Chat name updated to "${name}" for conversation ${conversationId} by user ${userId}`);
      if (callback) {
        callback({ success: true, data: updatedChat });
      }
    } catch (error) {
      errorHandler(socket, "Failed to update chat name", error);
      console.error("Lỗi chi tiết:", error);
      if (callback) {
        callback({ success: false, message: "Failed to update chat name", error: error.message });
      }
    }
  },
  // Thêm thành viên vào nhóm
  async handleAddParticipant(socket, { conversationId, userId: newUserId, role }, userId, io, callback) {
    try {
      if (!newUserId || !role) {
        socket.emit("error", { message: "Invalid participant data" });
        return callback && callback({ success: false, message: "Invalid participant data" });
      }
  
      logger.info(`User ${userId} adding user ${newUserId} with role ${role} to conversation ${conversationId}`);
      const chat = await Conversation.findById(conversationId);
      if (!chat) {
        socket.emit("error", { message: "Conversation not found" });
        return callback && callback({ success: false, message: "Conversation not found" });
      }
  
      // Kiểm tra xem userId của người gọi có trong cuộc trò chuyện không
      const currentUser = chat.participants.find(
        (p) => p.userId.toString() === userId
      );
      if (!currentUser) {
        socket.emit("error", { message: "User not found in this conversation" });
        return callback && callback({ success: false, message: "User not found in this conversation" });
      }
  
      // Bỏ kiểm tra quyền: Không cần kiểm tra currentUser.role === "admin"
  
      // Kiểm tra xem user đã có trong nhóm chưa
      const exists = chat.participants.some(
        (p) => p.userId.toString() === newUserId
      );
      if (exists) {
        socket.emit("error", { message: "User is already in this conversation" });
        return callback && callback({ success: false, message: "User is already in this conversation" });
      }
  
      const updatedChat = await Conversation.findByIdAndUpdate(
        conversationId,
        { $push: { participants: { userId: newUserId, role } }, updatedAt: new Date() },
        { new: true }
      ).populate("participants.userId");
  
      io.to(conversationId).emit("chatInfoUpdated", {
        conversationId,
        participants: updatedChat.participants,
      });
      io.to(newUserId).emit("conversationCreated", updatedChat); // Thông báo cho người dùng mới
      logger.info(`User ${newUserId} added to conversation ${conversationId}`);
      if (callback) {
        callback({ success: true, data: updatedChat });
      }
    } catch (error) {
      errorHandler(socket, "Failed to add participant", error);
      if (callback) {
        callback({ success: false, message: "Failed to add participant" });
      }
    }
  },

  // Xóa thành viên khỏi nhóm 
  async handleRemoveParticipant(socket, { conversationId, userId: removeUserId }, userId, io, callback) {
    try {
      if (!removeUserId) {
        socket.emit("error", { message: "Missing userId to remove" });
        return callback && callback({ success: false, message: "Missing userId to remove" });
      }

      logger.info(`User ${userId} removing user ${removeUserId} from conversation ${conversationId}`);
      const chat = await Conversation.findById(conversationId);
      if (!chat) {
        socket.emit("error", { message: "Conversation not found" });
        return callback && callback({ success: false, message: "Conversation not found" });
      }

      // Kiểm tra quyền: Chỉ admin mới được xóa thành viên
      const currentUser = chat.participants.find(
        (p) => p.userId.toString() === userId
      );
      if (!currentUser || currentUser.role !== "admin") {
        socket.emit("error", { message: "You are not authorized to remove participants" });
        return callback && callback({ success: false, message: "You are not authorized to remove participants" });
      }

      // Không cho phép admin tự xóa chính mình
      if (userId === removeUserId) {
        socket.emit("error", { message: "Admin cannot remove themselves. Please transfer admin role first." });
        return callback && callback({ success: false, message: "Admin cannot remove themselves. Please transfer admin role first." });
      }

      const updatedChat = await Conversation.findByIdAndUpdate(
        conversationId,
        { $pull: { participants: { userId: removeUserId } }, updatedAt: new Date() },
        { new: true }
      ).populate("participants.userId");

      io.to(conversationId).emit("chatInfoUpdated", {
        conversationId,
        participants: updatedChat.participants,
      });
      io.to(removeUserId).emit("conversationRemoved", { conversationId }); // Thông báo cho người bị xóa
      logger.info(`User ${removeUserId} removed from conversation ${conversationId}`);
      if (callback) {
        callback({ success: true, data: updatedChat });
      }
    } catch (error) {
      errorHandler(socket, "Failed to remove participant", error);
      if (callback) {
        callback({ success: false, message: "Failed to remove participant" });
      }
    }
  },

  // Thay đổi vai trò của thành viên
  async handleChangeParticipantRole(socket, { conversationId, userId: targetUserId, role }, userId, io, callback) {
    try {
      if (!targetUserId || !role) {
        socket.emit("error", { message: "Invalid role change data" });
        return callback && callback({ success: false, message: "Invalid role change data" });
      }

      logger.info(`User ${userId} changing role of user ${targetUserId} to ${role} in conversation ${conversationId}`);
      const chat = await Conversation.findById(conversationId);
      if (!chat) {
        socket.emit("error", { message: "Conversation not found" });
        return callback && callback({ success: false, message: "Conversation not found" });
      }

      // Kiểm tra quyền: Chỉ admin mới được thay đổi vai trò
      const currentUser = chat.participants.find(
        (p) => p.userId.toString() === userId
      );
      if (!currentUser || currentUser.role !== "admin") {
        socket.emit("error", { message: "You are not authorized to change participant roles" });
        return callback && callback({ success: false, message: "You are not authorized to change participant roles" });
      }

      // Kiểm tra xem target user có trong nhóm không
      const targetParticipant = chat.participants.find(
        (p) => p.userId.toString() === targetUserId
      );
      if (!targetParticipant) {
        socket.emit("error", { message: "Target user not found in conversation" });
        return callback && callback({ success: false, message: "Target user not found in conversation" });
      }

      const updatedChat = await Conversation.findOneAndUpdate(
        { _id: conversationId, "participants.userId": targetUserId },
        { $set: { "participants.$.role": role }, updatedAt: new Date() },
        { new: true }
      ).populate("participants.userId");

      io.to(conversationId).emit("chatInfoUpdated", {
        conversationId,
        participants: updatedChat.participants,
      });
      logger.info(`Role of user ${targetUserId} changed to ${role} in conversation ${conversationId}`);
      if (callback) {
        callback({ success: true, data: updatedChat });
      }
    } catch (error) {
      errorHandler(socket, "Failed to change participant role", error);
      if (callback) {
        callback({ success: false, message: "Failed to change participant role" });
      }
    }
  },

  // Chuyển quyền trưởng nhóm
  async handleTransferGroupAdmin(socket, { conversationId, userId: newAdminUserId }, userId, io, callback) {
    try {
      logger.info(`User ${userId} transferring group admin role to user ${newAdminUserId} in conversation ${conversationId}`);
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        socket.emit("error", { message: "Conversation not found" });
        return callback && callback({ success: false, message: "Conversation not found" });
      }

      // Kiểm tra quyền: Chỉ admin hiện tại mới được chuyển quyền
      const currentAdmin = conversation.participants.find(
        (p) => p.userId.toString() === userId && p.role === "admin"
      );
      if (!currentAdmin) {
        socket.emit("error", { message: "You are not authorized to transfer admin role" });
        return callback && callback({ success: false, message: "You are not authorized to transfer admin role" });
      }

      // Kiểm tra xem người dùng mới có trong nhóm không
      const newAdmin = conversation.participants.find(
        (p) => p.userId.toString() === newAdminUserId
      );
      if (!newAdmin) {
        socket.emit("error", { message: "New admin user not found in conversation" });
        return callback && callback({ success: false, message: "New admin user not found in conversation" });
      }

      // Chuyển vai trò
      await Conversation.updateOne(
        { _id: conversationId, "participants.userId": userId },
        { $set: { "participants.$.role": "member" } }
      );
      await Conversation.updateOne(
        { _id: conversationId, "participants.userId": newAdminUserId },
        { $set: { "participants.$.role": "admin" } }
      );
      await Conversation.updateOne(
        { _id: conversationId },
        { updatedAt: new Date() }
      );

      const updatedConversation = await Conversation.findById(conversationId).populate("participants.userId");
      io.to(conversationId).emit("chatInfoUpdated", {
        conversationId,
        participants: updatedConversation.participants,
      });
      logger.info(`Admin role transferred to user ${newAdminUserId} in conversation ${conversationId}`);
      if (callback) {
        callback({ success: true, data: updatedConversation });
      }
    } catch (error) {
      errorHandler(socket, "Failed to transfer group admin role", error);
      if (callback) {
        callback({ success: false, message: "Failed to transfer group admin role" });
      }
    }
  },

  // Lấy danh sách media trong nhóm
  async handleGetChatMedia(socket, { conversationId }, userId, callback) {
    try {
      logger.info(`User ${userId} requesting media for conversation ${conversationId}`);
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        socket.emit("error", { message: "Conversation not found" });
        return callback && callback({ success: false, message: "Conversation not found" });
      }

      // Kiểm tra xem người dùng có trong cuộc trò chuyện không
      const participant = conversation.participants.find(
        (p) => p.userId.toString() === userId
      );
      if (!participant) {
        socket.emit("error", { message: "User not found in this conversation" });
        return callback && callback({ success: false, message: "User not found in this conversation" });
      }

      const media = await Message.find({
        conversationId,
        messageType: { $in: ["image", "video"] },
        linkURL: { $exists: true, $ne: [] },
        deletedBy: { $ne: userId },
        isRevoked: false,
      })
        .select("_id messageType content linkURL userId createdAt")
        .lean();

      socket.emit("chatMedia", media.length ? media : []);
      logger.info(`Media sent to user ${userId} for conversation ${conversationId}`);
      if (callback) {
        callback({ success: true, data: media.length ? media : [] });
      }
    } catch (error) {
      errorHandler(socket, "Failed to get chat media", error);
      if (callback) {
        callback({ success: false, message: "Failed to get chat media" });
      }
    }
  },

  // Lấy danh sách file trong nhóm
  async handleGetChatFiles(socket, { conversationId }, userId, callback) {
    try {
      logger.info(`User ${userId} requesting files for conversation ${conversationId}`);
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        socket.emit("error", { message: "Conversation not found" });
        return callback && callback({ success: false, message: "Conversation not found" });
      }

      // Kiểm tra xem người dùng có trong cuộc trò chuyện không
      const participant = conversation.participants.find(
        (p) => p.userId.toString() === userId
      );
      if (!participant) {
        socket.emit("error", { message: "User not found in this conversation" });
        return callback && callback({ success: false, message: "User not found in this conversation" });
      }

      const files = await Message.find({
        conversationId,
        messageType: "file",
        deletedBy: { $ne: userId },
        isRevoked: false,
      }).lean();

      socket.emit("chatFiles", files.length ? files : []);
      logger.info(`Files sent to user ${userId} for conversation ${conversationId}`);
      if (callback) {
        callback({ success: true, data: files.length ? files : [] });
      }
    } catch (error) {
      errorHandler(socket, "Failed to get chat files", error);
      if (callback) {
        callback({ success: false, message: "Failed to get chat files" });
      }
    }
  },

  // Lấy danh sách link trong nhóm
  async handleGetChatLinks(socket, { conversationId }, userId, callback) {
    try {
      logger.info(`User ${userId} requesting links for conversation ${conversationId}`);
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        socket.emit("error", { message: "Conversation not found" });
        return callback && callback({ success: false, message: "Conversation not found" });
      }

      // Kiểm tra xem người dùng có trong cuộc trò chuyện không
      const participant = conversation.participants.find(
        (p) => p.userId.toString() === userId
      );
      if (!participant) {
        socket.emit("error", { message: "User not found in this conversation" });
        return callback && callback({ success: false, message: "User not found in this conversation" });
      }

      const links = await Message.find({
        conversationId,
        messageType: "link",
        deletedBy: { $ne: userId },
        isRevoked: false,
      }).lean();

      socket.emit("chatLinks", links.length ? links : []);
      logger.info(`Links sent to user ${userId} for conversation ${conversationId}`);
      if (callback) {
        callback({ success: true, data: links.length ? links : [] });
      }
    } catch (error) {
      errorHandler(socket, "Failed to get chat links", error);
      if (callback) {
        callback({ success: false, message: "Failed to get chat links" });
      }
    }
  },

  // Lấy toàn bộ media, file và link trong nhóm
  async handleGetChatStorage(socket, { conversationId }, userId, callback) {
    try {
      logger.info(`User ${userId} requesting storage for conversation ${conversationId}`);
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        socket.emit("error", { message: "Conversation not found" });
        return callback && callback({ success: false, message: "Conversation not found" });
      }

      // Kiểm tra xem người dùng có trong cuộc trò chuyện không
      const participant = conversation.participants.find(
        (p) => p.userId.toString() === userId
      );
      if (!participant) {
        socket.emit("error", { message: "User not found in this conversation" });
        return callback && callback({ success: false, message: "User not found in this conversation" });
      }

      const messages = await Message.find({
        conversationId,
        messageType: { $in: ["image", "video", "file", "link"] },
        deletedBy: { $ne: userId },
        isRevoked: false,
      }).lean();

      const media = [];
      const files = [];
      const links = [];
      messages.forEach((msg) => {
        if (msg.messageType === "image" || msg.messageType === "video") {
          media.push(msg);
        } else if (msg.messageType === "file") {
          files.push(msg);
        } else if (msg.messageType === "link") {
          links.push(msg);
        }
      });

      socket.emit("chatStorage", { media, files, links });
      logger.info(`Storage sent to user ${userId} for conversation ${conversationId}`);
      if (callback) {
        callback({ success: true, data: { media, files, links } });
      }
    } catch (error) {
      errorHandler(socket, "Failed to get chat storage", error);
      if (callback) {
        callback({ success: false, message: "Failed to get chat storage" });
      }
    }
  },

  // Ghim cuộc trò chuyện
  async handlePinChat(socket, { conversationId, isPinned }, userId, io, callback) {
    try {
      if (typeof isPinned !== "boolean") {
        socket.emit("error", { message: "isPinned must be a boolean" });
        return callback && callback({ success: false, message: "isPinned must be a boolean" });
      }

      logger.info(`User ${userId} pinning conversation ${conversationId} with status ${isPinned}`);
      const chat = await Conversation.findOneAndUpdate(
        { _id: conversationId, "participants.userId": userId },
        { $set: { "participants.$.isPinned": isPinned }, updatedAt: new Date() },
        { new: true }
      ).populate("participants.userId");

      if (!chat) {
        socket.emit("error", { message: "Conversation not found" });
        return callback && callback({ success: false, message: "Conversation not found" });
      }

      io.to(conversationId).emit("chatInfoUpdated", {
        conversationId,
        participants: chat.participants,
      });
      logger.info(`Conversation ${conversationId} pinned status updated to ${isPinned} for user ${userId}`);
      if (callback) {
        callback({ success: true, data: chat });
      }
    } catch (error) {
      errorHandler(socket, "Failed to pin chat", error);
      if (callback) {
        callback({ success: false, message: "Failed to pin chat" });
      }
    }
  },

  // Tắt/bật thông báo nhóm
  async handleUpdateNotification(socket, { conversationId, mute }, userId, io, callback) {
    try {
      // Định nghĩa các giá trị hợp lệ cho mute theo conversationSchema
      const validMuteValues = ["1h", "4h", "8am", "forever", null];
  
      // Kiểm tra mute có thuộc tập giá trị hợp lệ không
      if (!validMuteValues.includes(mute)) {
        socket.emit("error", {
          message: "mute must be one of: '1h', '4h', '8am', 'forever', or null",
        });
        return callback && callback({
          success: false,
          message: "mute must be one of: '1h', '4h', '8am', 'forever', or null",
        });
      }
  
      logger.info(`User ${userId} updating notification status to ${mute} for conversation ${conversationId}`);
      const chat = await Conversation.findOneAndUpdate(
        { _id: conversationId, "participants.userId": userId },
        { $set: { "participants.$.mute": mute }, updatedAt: new Date() },
        { new: true }
      ).populate("participants.userId");
  
      if (!chat) {
        socket.emit("error", { message: "Conversation not found" });
        return callback && callback({ success: false, message: "Conversation not found" });
      }
  
      io.to(conversationId).emit("chatInfoUpdated", {
        conversationId,
        participants: chat.participants,
      });
      logger.info(`Notification status updated to ${mute} for user ${userId} in conversation ${conversationId}`);
      if (callback) {
        callback({ success: true, data: chat });
      }
    } catch (error) {
      errorHandler(socket, "Failed to update notification", error);
      if (callback) {
        callback({ success: false, message: "Failed to update notification" });
      }
    }
  },

  // Ẩn trò chuyện
  async handleHideChat(socket, { conversationId, isHidden, pin }, userId, io, callback) {
    try {
      if (typeof isHidden !== "boolean") {
        socket.emit("error", { message: "isHidden must be a boolean" });
        return callback && callback({ success: false, message: "isHidden must be a boolean" });
      }

      logger.info(`User ${userId} hiding conversation ${conversationId} with status ${isHidden}`);
      const chat = await Conversation.findById(conversationId);
      if (!chat) {
        socket.emit("error", { message: "Conversation not found" });
        return callback && callback({ success: false, message: "Conversation not found" });
      }

      const participant = chat.participants.find((p) => p.userId.toString() === userId);
      if (!participant) {
        socket.emit("error", { message: "User not found in this conversation" });
        return callback && callback({ success: false, message: "User not found in this conversation" });
      }

      participant.isHidden = isHidden;
      if (isHidden && pin) {
        const saltRounds = 10;
        participant.pin = await bcrypt.hash(pin.toString(), saltRounds);
      } else if (!isHidden) {
        participant.pin = null;
      }

      chat.updatedAt = new Date();
      await chat.save();

      io.to(conversationId).emit("chatInfoUpdated", {
        conversationId,
        participants: chat.participants,
      });
      logger.info(`Conversation ${conversationId} hidden status updated for user ${userId}`);
      if (callback) {
        callback({ success: true, data: chat });
      }
    } catch (error) {
      errorHandler(socket, "Failed to hide/unhide conversation", error);
      if (callback) {
        callback({ success: false, message: "Failed to hide/unhide conversation" });
      }
    }
  },

  // Xóa lịch sử trò chuyện cho người dùng
  async handleDeleteChatHistoryForMe(socket, { conversationId }, userId, io, callback) {
    try {
      logger.info(`User ${userId} deleting chat history for conversation ${conversationId}`);
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        socket.emit("error", { message: "Conversation not found" });
        return callback && callback({ success: false, message: "Conversation not found" });
      }

      // Kiểm tra xem người dùng có trong cuộc trò chuyện không
      const participant = conversation.participants.find(
        (p) => p.userId.toString() === userId
      );
      if (!participant) {
        socket.emit("error", { message: "User not found in this conversation" });
        return callback && callback({ success: false, message: "User not found in this conversation" });
      }

      await Message.updateMany(
        { conversationId },
        { $addToSet: { deletedBy: userId } }
      );

      const lastValidMessage = await Message.findOne({
        conversationId,
        isRevoked: false,
        deletedBy: { $ne: userId },
      }).sort({ createdAt: -1 });

      conversation.lastMessage = lastValidMessage ? lastValidMessage._id : null;
      conversation.updatedAt = new Date();
      await conversation.save();

      io.to(conversationId).emit("conversationUpdated", {
        conversationId,
        lastMessage: lastValidMessage || null,
        updatedAt: conversation.updatedAt,
      });

      socket.emit("chatHistoryDeleted", { conversationId });
      logger.info(`Chat history deleted for user ${userId} in conversation ${conversationId}`);
      if (callback) {
        callback({ success: true, data: { conversationId } });
      }
    } catch (error) {
      errorHandler(socket, "Failed to delete chat history", error);
      if (callback) {
        callback({ success: false, message: "Failed to delete chat history" });
      }
    }
  },

  // Lấy danh sách nhóm chung
  async handleGetCommonGroups(socket, { conversationId }, userId, callback) {
    try {
      logger.info(`User ${userId} requesting common groups for conversation ${conversationId}`);
      const currentConversation = await Conversation.findById(conversationId).populate("participants.userId");
      if (!currentConversation) {
        socket.emit("error", { message: "Conversation not found" });
        return callback && callback({ success: false, message: "Conversation not found" });
      }

      // Kiểm tra xem người dùng có trong cuộc trò chuyện không
      const participant = currentConversation.participants.find(
        (p) => p.userId._id.toString() === userId
      );
      if (!participant) {
        socket.emit("error", { message: "User not found in this conversation" });
        return callback && callback({ success: false, message: "User not found in this conversation" });
      }

      const participantIds = currentConversation.participants.map((p) => p.userId._id.toString());
      const commonGroups = await Conversation.find({
        _id: { $ne: conversationId },
        isGroup: true,
        "participants.userId": { $all: participantIds },
      }).populate("participants.userId").lean();

      socket.emit("commonGroups", {
        currentConversation,
        commonGroups,
      });
      logger.info(`Common groups sent to user ${userId} for conversation ${conversationId}`);
      if (callback) {
        callback({ success: true, data: { currentConversation, commonGroups } });
      }
    } catch (error) {
      errorHandler(socket, "Failed to get common groups", error);
      if (callback) {
        callback({ success: false, message: "Failed to get common groups" });
      }
    }
  },

  // Tìm kiếm tin nhắn trong nhóm
  async handleFindMessages(socket, { conversationId, query }, userId, callback) {
    try {
      if (!query?.trim()) {
        socket.emit("error", { message: "Search term cannot be empty" });
        return callback && callback({ success: false, message: "Search term cannot be empty" });
      }

      logger.info(`User ${userId} searching messages in conversation ${conversationId} with term "${query}"`);
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        socket.emit("error", { message: "Conversation not found" });
        return callback && callback({ success: false, message: "Conversation not found" });
      }

      // Kiểm tra xem người dùng có trong cuộc trò chuyện không
      const participant = conversation.participants.find(
        (p) => p.userId.toString() === userId
      );
      if (!participant) {
        socket.emit("error", { message: "User not found in this conversation" });
        return callback && callback({ success: false, message: "User not found in this conversation" });
      }

      const messages = await Message.find({
        conversationId,
        content: { $regex: query, $options: "i" },
        deletedBy: { $ne: userId },
        isRevoked: false,
      }).lean();

      socket.emit("foundMessages", messages);
      logger.info(`Search results sent to user ${userId} for conversation ${conversationId}`);
      if (callback) {
        callback({ success: true, data: messages });
      }
    } catch (error) {
      errorHandler(socket, "Failed to search messages", error);
      if (callback) {
        callback({ success: false, message: "Failed to search messages" });
      }
    }
  },

  // Xóa tin nhắn
  async handleDeleteMessage(socket, { messageId }, userId, io, callback) {
    try {
      logger.info(`User ${userId} deleting message ${messageId}`);
      const message = await Message.findById(messageId);
      if (!message) {
        socket.emit("error", { message: "Message not found" });
        return callback && callback({ success: false, message: "Message not found" });
      }

      // Kiểm tra xem người dùng có quyền xóa tin nhắn không (chỉ người gửi mới được xóa)
      if (message.userId.toString() !== userId) {
        socket.emit("error", { message: "You are not authorized to delete this message" });
        return callback && callback({ success: false, message: "You are not authorized to delete this message" });
      }

      await Message.updateOne(
        { _id: messageId },
        { $addToSet: { deletedBy: userId } }
      );

      const conversation = await Conversation.findById(message.conversationId);
      if (conversation) {
        const lastValidMessage = await Message.findOne({
          conversationId: message.conversationId,
          isRevoked: false,
          deletedBy: { $ne: userId },
        }).sort({ createdAt: -1 });

        conversation.lastMessage = lastValidMessage ? lastValidMessage._id : null;
        conversation.updatedAt = new Date();
        await conversation.save();

        io.to(message.conversationId).emit("messageDeleted", { messageId, conversationId: message.conversationId });
        io.to(message.conversationId).emit("conversationUpdated", {
          conversationId: message.conversationId,
          lastMessage: lastValidMessage || null,
          updatedAt: conversation.updatedAt,
        });
      }

      // Gửi thông báo cập nhật danh sách media, file, link
      if (message.messageType === "image" || message.messageType === "video") {
        const media = await Message.find({
          conversationId: message.conversationId,
          messageType: { $in: ["image", "video"] },
          linkURL: { $exists: true, $ne: [] },
          deletedBy: { $ne: userId },
          isRevoked: false,
        }).lean();
        io.to(message.conversationId).emit("chatMedia", media.length ? media : []);
      } else if (message.messageType === "file") {
        const files = await Message.find({
          conversationId: message.conversationId,
          messageType: "file",
          deletedBy: { $ne: userId },
          isRevoked: false,
        }).lean();
        io.to(message.conversationId).emit("chatFiles", files.length ? files : []);
      } else if (message.messageType === "link") {
        const links = await Message.find({
          conversationId: message.conversationId,
          messageType: "link",
          deletedBy: { $ne: userId },
          isRevoked: false,
        }).lean();
        io.to(message.conversationId).emit("chatLinks", links.length ? links : []);
      }

      logger.info(`Message ${messageId} deleted by user ${userId}`);
      if (callback) {
        callback({ success: true, data: { messageId } });
      }
    } catch (error) {
      errorHandler(socket, "Failed to delete message", error);
      if (callback) {
        callback({ success: false, message: "Failed to delete message" });
      }
    }
  },

  // Chuyển tiếp tin nhắn
  async handleForwardMessage(socket, { messageId, targetConversationIds, userId: forwarderId, content }, userId, io, callback) {
    try {
      if (!messageId || !Array.isArray(targetConversationIds) || targetConversationIds.length === 0 || !forwarderId) {
        socket.emit("error", { message: "Invalid data to forward message" });
        return callback && callback({ success: false, message: "Invalid data to forward message" });
      }

      // Kiểm tra xem userId có khớp với forwarderId không
      if (userId !== forwarderId) {
        socket.emit("error", { message: "User ID mismatch" });
        return callback && callback({ success: false, message: "User ID mismatch" });
      }

      logger.info(`User ${userId} forwarding message ${messageId} to conversations ${targetConversationIds}`);
      const originalMessage = await Message.findById(messageId).lean();
      if (!originalMessage) {
        socket.emit("error", { message: "Message not found" });
        return callback && callback({ success: false, message: "Message not found" });
      }

      // Kiểm tra xem người dùng có trong cuộc trò chuyện gốc không
      const originalConversation = await Conversation.findById(originalMessage.conversationId);
      if (!originalConversation) {
        socket.emit("error", { message: "Original conversation not found" });
        return callback && callback({ success: false, message: "Original conversation not found" });
      }

      const participantInOriginal = originalConversation.participants.find(
        (p) => p.userId.toString() === userId
      );
      if (!participantInOriginal) {
        socket.emit("error", { message: "User not found in the original conversation" });
        return callback && callback({ success: false, message: "User not found in the original conversation" });
      }

      const forwardedConversations = [];
      for (const targetConversationId of targetConversationIds) {
        const targetConversation = await Conversation.findById(targetConversationId);
        if (!targetConversation) {
          logger.warn(`Target conversation ${targetConversationId} not found`);
          continue;
        }

        // Kiểm tra xem người dùng có trong cuộc trò chuyện đích không
        const participantInTarget = targetConversation.participants.find(
          (p) => p.userId.toString() === userId
        );
        if (!participantInTarget) {
          logger.warn(`User ${userId} not found in target conversation ${targetConversationId}`);
          continue;
        }

        // Tạo tin nhắn mới trong cuộc trò chuyện đích
        const newMessage = new Message({
          conversationId: targetConversationId,
          userId: forwarderId,
          content: content || originalMessage.content,
          messageType: originalMessage.messageType,
          linkURL: originalMessage.linkURL,
          createdAt: new Date(),
          isForwarded: true,
          originalMessageId: messageId,
        });
        await newMessage.save();

        // Cập nhật lastMessage của cuộc trò chuyện đích
        targetConversation.lastMessage = newMessage._id;
        targetConversation.updatedAt = new Date();
        await targetConversation.save();

        // Gửi tin nhắn mới tới tất cả thành viên trong cuộc trò chuyện đích
        io.to(targetConversationId).emit("newMessage", newMessage);

        // Cập nhật danh sách media, file, link nếu cần
        if (newMessage.messageType === "image" || newMessage.messageType === "video") {
          const media = await Message.find({
            conversationId: targetConversationId,
            messageType: { $in: ["image", "video"] },
            linkURL: { $exists: true, $ne: [] },
            deletedBy: { $ne: userId },
            isRevoked: false,
          }).lean();
          io.to(targetConversationId).emit("chatMedia", media.length ? media : []);
        } else if (newMessage.messageType === "file") {
          const files = await Message.find({
            conversationId: targetConversationId,
            messageType: "file",
            deletedBy: { $ne: userId },
            isRevoked: false,
          }).lean();
          io.to(targetConversationId).emit("chatFiles", files.length ? files : []);
        } else if (newMessage.messageType === "link") {
          const links = await Message.find({
            conversationId: targetConversationId,
            messageType: "link",
            deletedBy: { $ne: userId },
            isRevoked: false,
          }).lean();
          io.to(targetConversationId).emit("chatLinks", links.length ? links : []);
        }

        forwardedConversations.push(targetConversationId);
      }

      if (forwardedConversations.length === 0) {
        socket.emit("error", { message: "No valid target conversations to forward the message" });
        return callback && callback({ success: false, message: "No valid target conversations to forward the message" });
      }

      socket.emit("messageForwarded", { messageId, targetConversationIds: forwardedConversations });
      logger.info(`Message ${messageId} forwarded by user ${userId} to ${forwardedConversations.length} conversations`);
      if (callback) {
        callback({ success: true, data: forwardedConversations });
      }
    } catch (error) {
      errorHandler(socket, "Failed to forward message", error);
      if (callback) {
        callback({ success: false, message: "Failed to forward message" });
      }
    }
  },
  async handleDisbandGroup(socket, { conversationId }, userId, io, callback) {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        socket.emit("error", { message: "Conversation not found" });
        return callback && callback({ success: false, message: "Conversation not found" });
      }
  
      const participant = conversation.participants.find(
        (p) => p.userId.toString() === userId
      );
      if (!participant || participant.role !== "admin") {
        socket.emit("error", { message: "You are not authorized to disband the group" });
        return callback && callback({ success: false, message: "You are not authorized to disband the group" });
      }
  
      await Conversation.findByIdAndDelete(conversationId);
      await Message.deleteMany({ conversationId });
  
      io.to(conversationId).emit("conversationRemoved", { conversationId });
  
      logger.info(`Group ${conversationId} disbanded by user ${userId}`);
      if (callback) {
        callback({ success: true });
      }
    } catch (error) {
      errorHandler(socket, "Failed to disband group", error);
      if (callback) {
        callback({ success: false, message: "Failed to disband group" });
      }
    }
  },
  // rời nhóm
  async  handleLeaveGroup(socket, { conversationId }, userId, io, callback) {
    try {
      if (!conversationId) {
        socket.emit("error", { message: "Missing conversation ID" });
        return callback && callback({ success: false, message: "Missing conversation ID" });
      }
  
      logger.info(`User ${userId} attempting to leave conversation ${conversationId}`);
      const chat = await Conversation.findById(conversationId);
      if (!chat) {
        socket.emit("error", { message: "Conversation not found" });
        return callback && callback({ success: false, message: "Conversation not found" });
      }
  
      // Kiểm tra xem người dùng có trong nhóm hay không
      const currentUser = chat.participants.find((p) => p.userId.toString() === userId);
      if (!currentUser) {
        socket.emit("error", { message: "You are not a participant in this conversation" });
        return callback && callback({ success: false, message: "You are not a participant in this conversation" });
      }
  
      // Xóa người dùng khỏi danh sách participants
      const updatedChat = await Conversation.findByIdAndUpdate(
        conversationId,
        { $pull: { participants: { userId } }, updatedAt: new Date() },
        { new: true }
      ).populate("participants.userId");
  
      if (!updatedChat) {
        socket.emit("error", { message: "Failed to update conversation" });
        return callback && callback({ success: false, message: "Failed to update conversation" });
      }
  
      // Phát sự kiện chatInfoUpdated tới tất cả client trong phòng
      io.to(conversationId).emit("chatInfoUpdated", {
        conversationId,
        participants: updatedChat.participants,
      });
  
      // Thông báo cho người rời nhóm
      io.to(userId).emit("conversationRemoved", { conversationId });
      logger.info(`User ${userId} left conversation ${conversationId}`);
  
      if (callback) {
        callback({ success: true, data: updatedChat });
      }
    } catch (error) {
      errorHandler(socket, "Failed to leave group", error);
      if (callback) {
        callback({ success: false, message: "Failed to leave group" });
      }
    }
  }
};