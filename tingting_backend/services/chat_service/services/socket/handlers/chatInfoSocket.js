const Conversation = require("../../../models/Conversation");
const Message = require("../../../models/Message");
const logger = require("../../../utils/logger");
const errorHandler = require("../../../utils/errorHandler");
const bcrypt = require("bcrypt");
const { handleConversationRemoved } = require("./conversation");
const mongoose = require("mongoose");


// Chuẩn hóa payload cho chatInfoUpdated
const createChatInfoPayload = (chat) => ({
  _id: chat._id,
  name: chat.name,
  isGroup: chat.isGroup,
  imageGroup: chat.imageGroup,
  participants: chat.participants.map((p) => ({
    _id: p._id,
    userId: p.userId,
    role: p.role,
    isPinned: p.isPinned,
    isHidden: p.isHidden,
    mute: p.mute,
  })),
  linkGroup: chat.linkGroup,
  updatedAt: chat.updatedAt,
});
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
  // async handleUpdateChatName(socket, { conversationId, name }, userId, io, callback) {
  //   try {
  //     logger.info(`User ${userId} requesting to update chat name for conversation ${conversationId}`);

  //     // Kiểm tra tên mới có hợp lệ không
  //     if (!name || typeof name !== "string" || name.trim() === "") {
  //       socket.emit("error", { message: "Chat name must be a non-empty string" });
  //       return callback && callback({ success: false, message: "Chat name must be a non-empty string" });
  //     }

  //     // Tìm cuộc trò chuyện
  //     const chat = await Conversation.findById(conversationId).lean();
  //     if (!chat) {
  //       socket.emit("error", { message: "Conversation not found" });
  //       return callback && callback({ success: false, message: "Conversation not found" });
  //     }

  //     // Kiểm tra xem user có trong cuộc trò chuyện không
  //     const participant = chat.participants.find((p) => p.userId === userId);
  //     if (!participant) {
  //       socket.emit("error", { message: "User not found in this conversation" });
  //       return callback && callback({ success: false, message: "User not found in this conversation" });
  //     }

  //     // Cập nhật tên nhóm
  //     const updatedChat = await Conversation.findByIdAndUpdate(
  //       conversationId,
  //       { $set: { name: name.trim(), updatedAt: new Date() } },
  //       { new: true }
  //     ).lean();

  //     if (!updatedChat) {
  //       socket.emit("error", { message: "Failed to update chat name" });
  //       return callback && callback({ success: false, message: "Failed to update chat name" });
  //     }

  //     // Lấy danh sách client trong phòng
  //     const roomClients = await io.in(conversationId).allSockets();
  //     logger.info(`Clients in room ${conversationId}:`, Array.from(roomClients));

  //     // Emit sự kiện cập nhật đến tất cả client trong cuộc trò chuyện
  //     const payload = {
  //       _id: updatedChat._id,
  //       name: updatedChat.name,
  //       participants: updatedChat.participants,
  //       isGroup: updatedChat.isGroup,
  //       imageGroup: updatedChat.imageGroup,
  //       updatedAt: updatedChat.updatedAt,
  //     };
  //     logger.info(`Emitting chatInfoUpdated to room ${conversationId}:`, payload);
  //     io.to(conversationId).emit("chatInfoUpdated", payload);
  //     logger.info(`Chat name updated to "${name}" for conversation ${conversationId} by user ${userId}`);

  //     if (callback) {
  //       callback({ success: true, data: updatedChat });
  //     }
  //   } catch (error) {
  //     errorHandler(socket, "Failed to update chat name", error);
  //     console.error("Lỗi chi tiết:", error);
  //     if (callback) {
  //       callback({ success: false, message: "Failed to update chat name", error: error.message });
  //     }
  //   }
  // },
  // Thêm thành viên vào nhóm
  async handleAddParticipant(socket, { conversationId, userId, role }, io, callback) {
    try {
      if (!conversationId || !userId) {
        socket.emit("error", { message: "Missing conversation ID or user ID" });
        return callback && callback({ success: false, message: "Missing conversation ID or user ID" });
      }

      logger.info(`Adding user ${userId} to conversation ${conversationId}`);
      const chat = await Conversation.findById(conversationId);
      if (!chat) {
        socket.emit("error", { message: "Conversation not found" });
        return callback && callback({ success: false, message: "Conversation not found" });
      }

      // Kiểm tra xem user đã trong nhóm chưa
      const userExists = chat.participants.some((p) => p.userId.toString() === userId);
      if (userExists) {
        socket.emit("error", { message: "User is already a participant" });
        return callback && callback({ success: false, message: "User is already a participant" });
      }

      // Thêm thành viên mới
      chat.participants.push({ userId, role: role || "member" });
      chat.updatedAt = new Date();
      const updatedChat = await chat.save();

      // Cập nhật thông tin nhóm cho các thành viên hiện tại
      io.to(conversationId).emit("chatInfoUpdated", {
        conversationId,
        participants: updatedChat.participants,
        name: updatedChat.name,
        isGroup: updatedChat.isGroup,
      });

      // Thông báo cho người dùng được thêm về cuộc trò chuyện mới
      logger.info(`Phát sự kiện conversationAdded tới user ${userId} với conversationId ${conversationId}`);
      io.to(userId).emit("conversationAdded", {
        conversationId: updatedChat._id,
        name: updatedChat.name,
        isGroup: updatedChat.isGroup,
        participants: updatedChat.participants,
        updatedAt: updatedChat.updatedAt,
      });

      logger.info(`User ${userId} added to conversation ${conversationId}`);
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
        .sort({ createdAt: -1 }) // Sắp xếp mới nhất trước
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
      }).sort({ createdAt: -1 }) // Sắp xếp mới nhất trước
        .lean();

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
      }).sort({ createdAt: -1 }) // Sắp xếp mới nhất trước
        .lean();

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


  // // // Tắt/bật thông báo nhóm
  // // async handleUpdateNotification(socket, { conversationId, mute }, userId, io, callback) {
  // //   try {
  // //     // Định nghĩa các giá trị hợp lệ cho mute theo conversationSchema
  // //     const validMuteValues = ["1h", "4h", "8am", "forever", null];

  // //     // Kiểm tra mute có thuộc tập giá trị hợp lệ không
  // //     if (!validMuteValues.includes(mute)) {
  // //       socket.emit("error", {
  // //         message: "mute must be one of: '1h', '4h', '8am', 'forever', or null",
  // //       });
  // //       return callback && callback({
  // //         success: false,
  // //         message: "mute must be one of: '1h', '4h', '8am', 'forever', or null",
  // //       });
  // //     }

  // //     logger.info(`User ${userId} updating notification status to ${mute} for conversation ${conversationId}`);
  // //     const chat = await Conversation.findOneAndUpdate(
  // //       { _id: conversationId, "participants.userId": userId },
  // //       { $set: { "participants.$.mute": mute }, updatedAt: new Date() },
  // //       { new: true }
  // //     ).populate("participants.userId");

  // //     if (!chat) {
  // //       socket.emit("error", { message: "Conversation not found" });
  // //       return callback && callback({ success: false, message: "Conversation not found" });
  // //     }

  // //     io.to(conversationId).emit("chatInfoUpdated", {
  // //       conversationId,
  // //       participants: chat.participants,
  // //     });
  // //     logger.info(`Notification status updated to ${mute} for user ${userId} in conversation ${conversationId}`);
  // //     if (callback) {
  // //       callback({ success: true, data: chat });
  // //     }
  // //   } catch (error) {
  // //     errorHandler(socket, "Failed to update notification", error);
  // //     if (callback) {
  // //       callback({ success: false, message: "Failed to update notification" });
  // //     }
  // //   }
  // // },

  // // // Ẩn trò chuyện
  // // async handleHideChat(socket, { conversationId, isHidden, pin }, userId, io, callback) {
  // //   try {
  // //     if (typeof isHidden !== "boolean") {
  // //       socket.emit("error", { message: "isHidden must be a boolean" });
  // //       return callback && callback({ success: false, message: "isHidden must be a boolean" });
  // //     }

  // //     logger.info(`User ${userId} hiding conversation ${conversationId} with status ${isHidden}`);
  // //     const chat = await Conversation.findById(conversationId);
  // //     if (!chat) {
  // //       socket.emit("error", { message: "Conversation not found" });
  // //       return callback && callback({ success: false, message: "Conversation not found" });
  // //     }

  // //     const participant = chat.participants.find((p) => p.userId.toString() === userId);
  // //     if (!participant) {
  // //       socket.emit("error", { message: "User not found in this conversation" });
  // //       return callback && callback({ success: false, message: "User not found in this conversation" });
  // //     }

  // //     participant.isHidden = isHidden;
  // //     if (isHidden && pin) {
  // //       const saltRounds = 10;
  // //       participant.pin = await bcrypt.hash(pin.toString(), saltRounds);
  // //     } else if (!isHidden) {
  // //       participant.pin = null;
  // //     }

  // //     chat.updatedAt = new Date();
  // //     await chat.save();

  // //     io.to(conversationId).emit("chatInfoUpdated", {
  // //       conversationId,
  // //       participants: chat.participants,
  // //     });
  // //     logger.info(`Conversation ${conversationId} hidden status updated for user ${userId}`);
  // //     if (callback) {
  // //       callback({ success: true, data: chat });
  // //     }
  // //   } catch (error) {
  // //     errorHandler(socket, "Failed to hide/unhide conversation", error);
  // //     if (callback) {
  // //       callback({ success: false, message: "Failed to hide/unhide conversation" });
  // //     }
  // //   }
  // // },

  // // Ghim cuộc trò chuyện
  // // async handlePinChat(socket, { conversationId, isPinned }, userId, io, callback) {
  // //   try {
  // //     if (!conversationId) {
  // //       socket.emit("error", { message: "conversationId is required" });
  // //       return callback && callback({ success: false, message: "conversationId is required" });
  // //     }

  // //     if (typeof isPinned !== "boolean") {
  // //       socket.emit("error", { message: "isPinned must be a boolean" });
  // //       return callback && callback({ success: false, message: "isPinned must be a boolean" });
  // //     }

  // //     logger.info(`User ${userId} pinning conversation ${conversationId} with status ${isPinned}`);
  // //     const chat = await Conversation.findOneAndUpdate(
  // //       { _id: conversationId, "participants.userId": userId },
  // //       { $set: { "participants.$.isPinned": isPinned }, updatedAt: new Date() },
  // //       { new: true }
  // //     ).populate("participants.userId");

  // //     if (!chat) {
  // //       socket.emit("error", { message: "Conversation not found or user not in conversation" });
  // //       return callback && callback({ success: false, message: "Conversation not found or user not in conversation" });
  // //     }

  // //     const chatInfo = {
  // //       _id: chat._id,
  // //       name: chat.name,
  // //       isGroup: chat.isGroup,
  // //       imageGroup: chat.imageGroup,
  // //       participants: chat.participants,
  // //       linkGroup: chat.linkGroup,
  // //       updatedAt: chat.updatedAt,
  // //     };

  // //     io.to(conversationId).emit("chatInfoUpdated", chatInfo);
  // //     logger.info(`Conversation ${conversationId} pinned status updated to ${isPinned} for user ${userId}`);
  // //     if (callback) {
  // //       callback({ success: true, data: chatInfo });
  // //     }
  // //   } catch (error) {
  // //     errorHandler(socket, "Failed to pin chat", error);
  // //     if (callback) {
  // //       callback({ success: false, message: "Failed to pin chat" });
  // //     }
  // //   }
  // // },

  // // Ghim cuộc trò chuyện
  // async handlePinChat(socket, { conversationId, isPinned }, userId, io, callback) {
  //   try {
  //     console.log("Backend: handlePinChat bắt đầu", { conversationId, isPinned, userId });
  //     if (!conversationId) {
  //       console.warn("Backend: Thiếu conversationId trong handlePinChat");
  //       socket.emit("error", { message: "conversationId is required" });
  //       return callback && callback({ from: "handlePinChat", success: false, message: "conversationId is required" });
  //     }

  //     if (typeof isPinned !== "boolean") {
  //       console.warn("Backend: isPinned không phải boolean", { isPinned });
  //       socket.emit("error", { message: "isPinned must be a boolean" });
  //       return callback && callback({ from: "handlePinChat", success: false, message: "isPinned must be a boolean" });
  //     }

  //     logger.info(`User ${userId} pinning conversation ${conversationId} with status ${isPinned}`);
  //     console.log("Backend: Cập nhật trạng thái pin trong DB", { conversationId, userId, isPinned });
  //     const chat = await Conversation.findOneAndUpdate(
  //       { _id: conversationId, "participants.userId": userId },
  //       { $set: { "participants.$.isPinned": isPinned }, updatedAt: new Date() },
  //       { new: true }
  //     ).populate("participants.userId");

  //     if (!chat) {
  //       console.warn("Backend: Không tìm thấy conversation hoặc user không tham gia", { conversationId, userId });
  //       socket.emit("error", { message: "Conversation not found or user not in conversation" });
  //       return callback && callback({ from: "handlePinChat", success: false, message: "Conversation not found or user not in conversation" });
  //     }

  //     const chatInfo = {
  //       _id: chat._id,
  //       name: chat.name,
  //       isGroup: chat.isGroup,
  //       imageGroup: chat.imageGroup,
  //       participants: chat.participants,
  //       linkGroup: chat.linkGroup,
  //       updatedAt: chat.updatedAt,
  //     };

  //     console.log("Backend: Phát sự kiện chatInfoUpdated", { chatInfo, room: conversationId });
  //     io.to(conversationId).emit("chatInfoUpdated", chatInfo);
  //     logger.info(`Conversation ${conversationId} pinned status updated to ${isPinned} for user ${userId}`);
  //     console.log("Backend: Gửi phản hồi thành công từ handlePinChat", { conversationId, isPinned });
  //     if (callback) {
  //       callback({ from: "handlePinChat", success: true, data: chatInfo });
  //     }
  //   } catch (error) {
  //     console.error("Backend: Lỗi trong handlePinChat", { error, conversationId, userId });
  //     errorHandler(socket, "Failed to pin chat", error);
  //     if (callback) {
  //       callback({ from: "handlePinChat", success: false, message: "Failed to pin chat" });
  //     }
  //   }
  // },

  // // Tắt/bật thông báo nhóm
  // async handleUpdateNotification(socket, { conversationId, mute }, userId, io, callback) {
  //   try {
  //     console.log("Backend: handleUpdateNotification bắt đầu", { conversationId, mute, userId });
  //     if (!conversationId) {
  //       console.warn("Backend: Thiếu conversationId trong handleUpdateNotification");
  //       socket.emit("error", { message: "conversationId is required" });
  //       return callback && callback({ from: "handleUpdateNotification", success: false, message: "conversationId is required" });
  //     }

  //     const validMuteValues = ["1h", "4h", "8am", "forever", null];
  //     if (!validMuteValues.includes(mute)) {
  //       console.warn("Backend: Giá trị mute không hợp lệ", { mute, validMuteValues });
  //       socket.emit("error", {
  //         message: "mute must be one of: '1h', '4h', '8am', 'forever', or null",
  //       });
  //       return callback && callback({
  //         from: "handleUpdateNotification",
  //         success: false,
  //         message: "mute must be one of: '1h', '4h', '8am', 'forever', or null",
  //       });
  //     }

  //     logger.info(`User ${userId} updating notification status to ${mute} for conversation ${conversationId}`);
  //     console.log("Backend: Cập nhật trạng thái mute trong DB", { conversationId, userId, mute });
  //     const chat = await Conversation.findOneAndUpdate(
  //       { _id: conversationId, "participants.userId": userId },
  //       { $set: { "participants.$.mute": mute }, updatedAt: new Date() },
  //       { new: true }
  //     ).populate("participants.userId");

  //     if (!chat) {
  //       console.warn("Backend: Không tìm thấy conversation hoặc user không tham gia", { conversationId, userId });
  //       socket.emit("error", { message: "Conversation not found or user not in conversation" });
  //       return callback && callback({ from: "handleUpdateNotification", success: false, message: "Conversation not found or user not in conversation" });
  //     }

  //     const chatInfo = {
  //       _id: chat._id,
  //       name: chat.name,
  //       isGroup: chat.isGroup,
  //       imageGroup: chat.imageGroup,
  //       participants: chat.participants,
  //       linkGroup: chat.linkGroup,
  //       updatedAt: chat.updatedAt,
  //     };

  //     console.log("Backend: Phát sự kiện chatInfoUpdated", { chatInfo, room: conversationId });
  //     io.to(conversationId).emit("chatInfoUpdated", chatInfo);
  //     logger.info(`Notification status updated to ${mute} for user ${userId} in conversation ${conversationId}`);
  //     console.log("Backend: Gửi phản hồi thành công từ handleUpdateNotification", { conversationId, mute });
  //     if (callback) {
  //       callback({ from: "handleUpdateNotification", success: true, data: chatInfo });
  //     }
  //   } catch (error) {
  //     console.error("Backend: Lỗi trong handleUpdateNotification", { error, conversationId, userId });
  //     errorHandler(socket, "Failed to update notification", error);
  //     if (callback) {
  //       callback({ from: "handleUpdateNotification", success: false, message: "Failed to update notification" });
  //     }
  //   }
  // },

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
  async deleteMessageChatInfo(socket, { messageId, urlIndex }, userId, io, callback) {
    try {
      // Log các tham số nhận được để debug
      logger.info(`deleteMessageChatInfo called with:`, {
        messageId,
        urlIndex,
        userId,
        hasIo: !!io,
        hasCallback: !!callback,
        callbackType: typeof callback,
      });

      logger.info(`User ${userId} attempting to delete URL at index ${urlIndex} of message ${messageId}`);

      // Kiểm tra messageId và userId hợp lệ
      if (!mongoose.isValidObjectId(messageId)) {
        logger.error(`Invalid messageId: ${messageId}`);
        socket.emit("error", { message: "Invalid message ID" });
        if (typeof callback === "function") {
          callback({ success: false, message: "Invalid message ID" });
        }
        return;
      }
      if (!userId || typeof userId !== "string") {
        logger.error(`Invalid userId: ${userId}`);
        socket.emit("error", { message: "Invalid user ID" });
        if (typeof callback === "function") {
          callback({ success: false, message: "Invalid user ID" });
        }
        return;
      }
      if (!Number.isInteger(urlIndex) || urlIndex < 0) {
        logger.error(`Invalid urlIndex: ${urlIndex}`);
        socket.emit("error", { message: "Invalid URL index" });
        if (typeof callback === "function") {
          callback({ success: false, message: "Invalid URL index" });
        }
        return;
      }

      // Tìm tin nhắn
      const message = await Message.findById(messageId).select("conversationId linkURL messageType isRevoked");
      if (!message) {
        logger.error(`Message not found: ${messageId}`);
        socket.emit("error", { message: "Message not found" });
        if (typeof callback === "function") {
          callback({ success: false, message: "Message not found" });
        }
        return;
      }

      // Kiểm tra urlIndex hợp lệ
      if (!message.linkURL || urlIndex >= message.linkURL.length) {
        logger.error(`urlIndex ${urlIndex} is invalid for message ${messageId}`);
        socket.emit("error", { message: "Invalid URL index for this message" });
        if (typeof callback === "function") {
          callback({ success: false, message: "Invalid URL index for this message" });
        }
        return;
      }

      // Tìm cuộc trò chuyện
      const conversation = await Conversation.findById(message.conversationId);
      if (!conversation) {
        logger.error(`Conversation not found: ${message.conversationId}`);
        socket.emit("error", { message: "Conversation not found" });
        if (typeof callback === "function") {
          callback({ success: false, message: "Conversation not found" });
        }
        return;
      }

      // Ghi log danh sách participants để debug
      logger.info(`Conversation participants: ${JSON.stringify(conversation.participants)}`);
      logger.info(`User ID: ${userId}`);

      // Kiểm tra xem userId có trong participants không
      const isParticipant = conversation.participants.some(
        (participant) => participant.userId === userId
      );
      if (!isParticipant) {
        logger.error(`User ${userId} is not a participant in conversation ${message.conversationId}`);
        socket.emit("error", { message: "You are not authorized to delete messages in this conversation" });
        if (typeof callback === "function") {
          callback({
            success: false,
            message: "You are not authorized to delete messages in this conversation",
          });
        }
        return;
      }

      // Xóa URL tại urlIndex
      const updateResult = await Message.updateOne(
        { _id: messageId },
        { $unset: { [`linkURL.${urlIndex}`]: 1 } }
      );

      if (updateResult.modifiedCount === 0) {
        logger.error(`Failed to remove URL at index ${urlIndex} for message ${messageId}`);
        socket.emit("error", { message: "Failed to remove URL" });
        if (typeof callback === "function") {
          callback({ success: false, message: "Failed to remove URL" });
        }
        return;
      }

      // Xóa các giá trị null/undefined trong linkURL
      await Message.updateOne(
        { _id: messageId },
        { $pull: { linkURL: null } }
      );

      // Kiểm tra nếu linkURL rỗng thì xóa tin nhắn
      const updatedMessage = await Message.findById(messageId).select("linkURL conversationId messageType");
      let isMessageDeleted = false;
      if (!updatedMessage.linkURL || updatedMessage.linkURL.length === 0) {
        await Message.deleteOne({ _id: messageId });
        logger.info(`Deleted message ${messageId} because linkURL is empty`);
        isMessageDeleted = true;
      } else {
        logger.info(`Removed URL at index ${urlIndex} from message ${messageId}`);
      }

      // Cập nhật lastMessage của cuộc trò chuyện
      const lastValidMessage = await Message.findOne({
        conversationId: message.conversationId,
        isRevoked: false,
        linkURL: { $exists: true, $ne: [] },
      }).sort({ createdAt: -1 });

      conversation.lastMessage = lastValidMessage ? lastValidMessage._id : null;
      conversation.updatedAt = new Date();
      await conversation.save();

      // Phát sự kiện socket
      if (isMessageDeleted) {
        io.to(message.conversationId.toString()).emit("messageDeleted", {
          messageId,
          conversationId: message.conversationId,
        });
      }

      io.to(message.conversationId.toString()).emit("conversationUpdated", {
        conversationId: message.conversationId,
        lastMessage: lastValidMessage || null,
        updatedAt: conversation.updatedAt,
      });

      // Cập nhật media, files, links
      if (message.messageType === "image" || message.messageType === "video") {
        const media = await Message.find({
          conversationId: message.conversationId,
          messageType: { $in: ["image", "video"] },
          linkURL: { $exists: true, $ne: [] },
          isRevoked: false,
        }).lean();
        io.to(message.conversationId.toString()).emit("chatMedia", media.length ? media : []);
      } else if (message.messageType === "file") {
        const files = await Message.find({
          conversationId: message.conversationId,
          messageType: "file",
          linkURL: { $exists: true, $ne: [] },
          isRevoked: false,
        }).lean();
        io.to(message.conversationId.toString()).emit("chatFiles", files.length ? files : []);
      } else if (message.messageType === "link") {
        const links = await Message.find({
          conversationId: message.conversationId,
          messageType: "link",
          linkURL: { $exists: true, $ne: [] },
          isRevoked: false,
        }).lean();
        io.to(message.conversationId.toString()).emit("chatLinks", links.length ? links : []);
      }

      logger.info(
        isMessageDeleted
          ? `Message ${messageId} deleted by user ${userId}`
          : `URL at index ${urlIndex} of message ${messageId} deleted by user ${userId}`
      );
      if (typeof callback === "function") {
        callback({
          success: true,
          data: { messageId, urlIndex, isMessageDeleted },
        });
      }
    } catch (error) {
      logger.error(`Failed to delete URL at index ${urlIndex} of message ${messageId}: ${error.message}`);
      errorHandler(socket, "Failed to delete URL", error);
      if (typeof callback === "function") {
        callback({ success: false, message: "Failed to delete URL" });
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
  // giải tán nhóm
  async handleDisbandGroup(socket, { conversationId }, userId, io, callback) {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        socket.emit("error", { message: "Conversation not found" });
        return callback && callback({ success: false, message: "Conversation not found" });
      }

      // Kiểm tra xem có phải nhóm không
      if (!conversation.isGroup) {
        socket.emit("error", { message: "Only groups can be disbanded" });
        return callback && callback({ success: false, message: "Only groups can be disbanded" });
      }

      // Gọi handleConversationRemoved để xử lý xóa
      await handleConversationRemoved(socket, { conversationId }, userId, io, callback);
    } catch (error) {
      errorHandler(socket, "Failed to disband group", error);
      if (callback) {
        callback({ success: false, message: "Failed to disband group" });
      }
    }
  },
  // rời nhóm
  async handleLeaveGroup(socket, { conversationId }, userId, io, callback) {
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

      const currentUser = chat.participants.find((p) => p.userId.toString() === userId);
      if (!currentUser) {
        socket.emit("error", { message: "You are not a participant in this conversation" });
        return callback && callback({ success: false, message: "You are not a participant in this conversation" });
      }

      const updatedChat = await Conversation.findByIdAndUpdate(
        conversationId,
        { $pull: { participants: { userId } }, updatedAt: new Date() },
        { new: true }
      ).populate("participants.userId");

      if (!updatedChat) {
        socket.emit("error", { message: "Failed to update conversation" });
        return callback && callback({ success: false, message: "Failed to update conversation" });
      }

      io.to(conversationId).emit("chatInfoUpdated", {
        conversationId,
        participants: updatedChat.participants,
      });

      // Thêm log chi tiết
      logger.info(`Phát sự kiện conversationRemoved tới user ${userId} với conversationId ${conversationId}`);
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
  },


  // Ghim cuộc trò chuyện
  async handlePinChat(socket, { conversationId, isPinned }, userId, io, callback) {
    try {
      console.log("Backend: handlePinChat bắt đầu", { conversationId, isPinned, userId });
      if (!conversationId) {
        console.warn("Backend: Thiếu conversationId trong handlePinChat");
        socket.emit("error", { message: "conversationId is required" });
        return callback({ from: "handlePinChat", success: false, message: "conversationId is required" });
      }

      if (typeof isPinned !== "boolean") {
        console.warn("Backend: isPinned không phải boolean", { isPinned });
        socket.emit("error", { message: "isPinned must be a boolean" });
        return callback({ from: "handlePinChat", success: false, message: "isPinned must be a boolean" });
      }

      logger.info(`User ${userId} pinning conversation ${conversationId} with status ${isPinned}`);
      console.log("Backend: Cập nhật trạng thái pin trong DB", { conversationId, userId, isPinned });
      const chat = await Conversation.findOneAndUpdate(
        { _id: conversationId, "participants.userId": userId },
        { $set: { "participants.$.isPinned": isPinned }, updatedAt: new Date() },
        { new: true }
      ).populate("participants.userId");

      if (!chat) {
        console.warn("Backend: Không tìm thấy conversation hoặc user không tham gia", { conversationId, userId });
        socket.emit("error", { message: "Conversation not found or user not in conversation" });
        return callback({ from: "handlePinChat", success: false, message: "Conversation not found or user not in conversation" });
      }

      const chatInfo = createChatInfoPayload(chat);
      console.log("Backend: Phát sự kiện chatInfoUpdated", { chatInfo, room: conversationId });
      io.to(conversationId).emit("chatInfoUpdated", chatInfo);
      logger.info(`Conversation ${conversationId} pinned status updated to ${isPinned} for user ${userId}`);
      console.log("Backend: Gửi phản hồi thành công từ handlePinChat", { conversationId, isPinned });
      callback({ from: "handlePinChat", success: true, data: chatInfo });
    } catch (error) {
      console.error("Backend: Lỗi trong handlePinChat", { error, conversationId, userId });
      errorHandler(socket, "Failed to pin chat", error);
      callback({ from: "handlePinChat", success: false, message: "Failed to pin chat" });
    }
  },

  // Tắt/bật thông báo nhóm
  async handleUpdateNotification(socket, { conversationId, mute }, userId, io, callback) {
    try {
      console.log("Backend: handleUpdateNotification bắt đầu", { conversationId, mute, userId });
      if (!conversationId) {
        console.warn("Backend: Thiếu conversationId trong handleUpdateNotification");
        socket.emit("error", { message: "conversationId is required" });
        return callback({ from: "handleUpdateNotification", success: false, message: "conversationId is required" });
      }

      const validMuteValues = ["1h", "4h", "8am", "forever", null];
      if (!validMuteValues.includes(mute)) {
        console.warn("Backend: Giá trị mute không hợp lệ", { mute, validMuteValues });
        socket.emit("error", {
          message: "mute must be one of: '1h', '4h', '8am', 'forever', or null",
        });
        return callback({
          from: "handleUpdateNotification",
          success: false,
          message: "mute must be one of: '1h', '4h', '8am', 'forever', or null",
        });
      }

      logger.info(`User ${userId} updating notification status to ${mute} for conversation ${conversationId}`);
      console.log("Backend: Cập nhật trạng thái mute trong DB", { conversationId, userId, mute });
      const chat = await Conversation.findOneAndUpdate(
        { _id: conversationId, "participants.userId": userId },
        { $set: { "participants.$.mute": mute }, updatedAt: new Date() },
        { new: true }
      ).populate("participants.userId");

      if (!chat) {
        console.warn("Backend: Không tìm thấy conversation hoặc user không tham gia", { conversationId, userId });
        socket.emit("error", { message: "Conversation not found or user not in conversation" });
        return callback({ from: "handleUpdateNotification", success: false, message: "Conversation not found or user not in conversation" });
      }

      const chatInfo = createChatInfoPayload(chat);
      console.log("Backend: Phát sự kiện chatInfoUpdated", { chatInfo, room: conversationId });
      io.to(conversationId).emit("chatInfoUpdated", chatInfo);
      logger.info(`Notification status updated to ${mute} for user ${userId} in conversation ${conversationId}`);
      console.log("Backend: Gửi phản hồi thành công từ handleUpdateNotification", { conversationId, mute });
      callback({ from: "handleUpdateNotification", success: true, data: chatInfo });
    } catch (error) {
      console.error("Backend: Lỗi trong handleUpdateNotification", { error, conversationId, userId });
      errorHandler(socket, "Failed to update notification", error);
      callback({ from: "handleUpdateNotification", success: false, message: "Failed to update notification" });
    }
  },

  // Ẩn trò chuyện
  async handleHideChat(socket, { conversationId, isHidden, pin }, userId, io, callback) {
    try {
      console.log("Backend: handleHideChat bắt đầu", { conversationId, isHidden, pin, userId });
      if (typeof isHidden !== "boolean") {
        console.warn("Backend: isHidden không phải boolean", { isHidden });
        socket.emit("error", { message: "isHidden must be a boolean" });
        return callback({ from: "handleHideChat", success: false, message: "isHidden must be a boolean" });
      }

      logger.info(`User ${userId} hiding conversation ${conversationId} with status ${isHidden}`);
      const chat = await Conversation.findById(conversationId);
      if (!chat) {
        console.warn("Backend: Không tìm thấy conversation", { conversationId });
        socket.emit("error", { message: "Conversation not found" });
        return callback({ from: "handleHideChat", success: false, message: "Conversation not found" });
      }

      const participant = chat.participants.find((p) => p.userId.toString() === userId);
      if (!participant) {
        console.warn("Backend: Người dùng không phải thành viên", { userId });
        socket.emit("error", { message: "User not found in this conversation" });
        return callback({ from: "handleHideChat", success: false, message: "User not found in this conversation" });
      }

      participant.isHidden = isHidden;
      if (isHidden && pin) {
        const bcrypt = require("bcrypt");
        const saltRounds = 10;
        participant.pin = await bcrypt.hash(pin.toString(), saltRounds);
        console.log("Backend: Mã hóa pin cho hidden chat", { conversationId, userId });
      } else if (!isHidden) {
        participant.pin = null;
        console.log("Backend: Xóa pin khi bỏ ẩn chat", { conversationId, userId });
      }

      chat.updatedAt = new Date();
      await chat.save();
      console.log("Backend: Cập nhật trạng thái hidden trong DB", { conversationId, userId, isHidden });

      const chatInfo = createChatInfoPayload(chat);
      console.log("Backend: Phát sự kiện chatInfoUpdated", { chatInfo, room: conversationId });
      io.to(conversationId).emit("chatInfoUpdated", chatInfo);
      logger.info(`Conversation ${conversationId} hidden status updated to ${isHidden} for user ${userId}`);
      console.log("Backend: Gửi phản hồi thành công từ handleHideChat", { conversationId, isHidden });
      callback({ from: "handleHideChat", success: true, data: chatInfo });
    } catch (error) {
      console.error("Backend: Lỗi trong handleHideChat", { error, conversationId, userId });
      errorHandler(socket, "Failed to hide/unhide conversation", error);
      callback({ from: "handleHideChat", success: false, message: "Failed to hide/unhide conversation" });
    }
  },

  // Cập nhật tên nhóm
  async handleUpdateChatName(socket, { conversationId, name }, userId, io, callback) {
    try {
      console.log("Backend: handleUpdateChatName bắt đầu", { conversationId, name, userId });
      if (!conversationId) {
        console.warn("Backend: Thiếu conversationId trong handleUpdateChatName");
        socket.emit("error", { message: "conversationId is required" });
        return callback({ from: "handleUpdateChatName", success: false, message: "conversationId is required" });
      }

      if (!name || typeof name !== "string" || name.trim().length === 0) {
        console.warn("Backend: Tên không hợp lệ", { name });
        socket.emit("error", { message: "Name must be a non-empty string" });
        return callback({ from: "handleUpdateChatName", success: false, message: "Name must be a non-empty string" });
      }

      logger.info(`User ${userId} updating chat name to ${name} for conversation ${conversationId}`);
      console.log("Backend: Cập nhật tên nhóm trong DB", { conversationId, userId, name });
      const chat = await Conversation.findOneAndUpdate(
        { _id: conversationId, "participants.userId": userId },
        { $set: { name: name.trim(), updatedAt: new Date() } },
        { new: true }
      ).populate("participants.userId");

      if (!chat) {
        console.warn("Backend: Không tìm thấy conversation hoặc user không tham gia", { conversationId, userId });
        socket.emit("error", { message: "Conversation not found or user not in conversation" });
        return callback({ from: "handleUpdateChatName", success: false, message: "Conversation not found or user not in conversation" });
      }

      const chatInfo = createChatInfoPayload(chat);
      console.log("Backend: Phát sự kiện chatInfoUpdated", { chatInfo, room: conversationId });
      io.to(conversationId).emit("chatInfoUpdated", chatInfo);
      logger.info(`Chat name updated to ${name} for conversation ${conversationId} by user ${userId}`);
      console.log("Backend: Gửi phản hồi thành công từ handleUpdateChatName", { conversationId, name });
      callback({ from: "handleUpdateChatName", success: true, data: chatInfo });
    } catch (error) {
      console.error("Backend: Lỗi trong handleUpdateChatName", { error, conversationId, userId });
      errorHandler(socket, "Failed to update chat name", error);
      callback({ from: "handleUpdateChatName", success: false, message: "Failed to update chat name" });
    }
  }

};