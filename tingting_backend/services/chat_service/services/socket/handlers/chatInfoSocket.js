const Conversation = require("../../../models/Conversation");
const Message = require("../../../models/Message");
const logger = require("../../../utils/logger");
const errorHandler = require("../../../utils/errorHandler");
const bcrypt = require("bcrypt");
const { handleConversationRemoved } = require("./conversation");
const mongoose = require("mongoose");

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

      // Lấy danh sách client trong phòng
      const roomClients = await io.in(conversationId).allSockets();
      logger.info(`Clients in room ${conversationId}:`, Array.from(roomClients));

      // Emit sự kiện cập nhật đến tất cả client trong cuộc trò chuyện
      const payload = {
        _id: updatedChat._id,
        name: updatedChat.name,
        participants: updatedChat.participants,
        isGroup: updatedChat.isGroup,
        imageGroup: updatedChat.imageGroup,
        updatedAt: updatedChat.updatedAt,
      };
      logger.info(`Emitting chatInfoUpdated to room ${conversationId}:`, payload);
      io.to(conversationId).emit("chatInfoUpdated", payload);
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


  // async handleAddParticipant(socket, { conversationId, userId: newUserId, role = "member", performerId }, userId, io, callback) {
  //   try {
  //     // Chuẩn hóa performerId
  //     const normalizedPerformerId = typeof performerId === "object" ? performerId._id || performerId.id || String(performerId) : performerId;

  //     // Kiểm tra đầu vào
  //     if (!conversationId || !newUserId) {
  //       logger.error(`Thiếu tham số: conversationId=${conversationId}, newUserId=${newUserId}`);
  //       socket.emit("error", { message: "Thiếu ID hội thoại hoặc ID người dùng" });
  //       return callback && callback({ success: false, message: "Thiếu ID hội thoại hoặc ID người dùng" });
  //     }

  //     if (!mongoose.Types.ObjectId.isValid(conversationId)) {
  //       logger.error(`conversationId không hợp lệ: ${conversationId}`);
  //       socket.emit("error", { message: "ID hội thoại không hợp lệ" });
  //       return callback && callback({ success: false, message: "ID hội thoại không hợp lệ" });
  //     }
  //     if (!mongoose.Types.ObjectId.isValid(newUserId)) {
  //       logger.error(`newUserId không hợp lệ: ${newUserId}`);
  //       socket.emit("error", { message: "ID người dùng không hợp lệ" });
  //       return callback && callback({ success: false, message: "ID người dùng không hợp lệ" });
  //     }
  //     if (!normalizedPerformerId || !mongoose.Types.ObjectId.isValid(normalizedPerformerId)) {
  //       logger.error(`performerId không hợp lệ: ${normalizedPerformerId}`);
  //       socket.emit("error", { message: "ID người thực hiện không hợp lệ" });
  //       return callback && callback({ success: false, message: "ID người thực hiện không hợp lệ" });
  //     }

  //     logger.info(`Người dùng ${normalizedPerformerId} đang thêm ${newUserId} vào hội thoại ${conversationId}`);

  //     // Tìm cuộc trò chuyện và populate thông tin userId
  //     const chat = await Conversation.findById(conversationId).populate({
  //       path: "participants.userId",
  //       select: "_id firstname surname avatar",
  //     });

  //     if (!chat) {
  //       logger.error(`Không tìm thấy hội thoại: ${conversationId}`);
  //       socket.emit("error", { message: "Không tìm thấy hội thoại" });
  //       return callback && callback({ success: false, message: "Không tìm thấy hội thoại" });
  //     }

  //     // Kiểm tra xem đây có phải là nhóm không
  //     if (!chat.isGroup) {
  //       logger.error(`Hội thoại ${conversationId} không phải là nhóm`);
  //       socket.emit("error", { message: "Chỉ nhóm mới có thể thêm thành viên" });
  //       return callback && callback({ success: false, message: "Chỉ nhóm mới có thể thêm thành viên" });
  //     }

  //     // Làm sạch participants: Loại bỏ các participant không hợp lệ sau populate
  //     const validParticipants = chat.participants.filter((p) => {
  //       if (!p.userId || !p.userId._id || !mongoose.Types.ObjectId.isValid(p.userId._id)) {
  //         logger.warn(`Participant không hợp lệ trong hội thoại ${conversationId}: userId=${p.userId?._id || "undefined"}`, p);
  //         return false;
  //       }
  //       return true;
  //     });

  //     if (validParticipants.length !== chat.participants.length) {
  //       logger.warn(
  //         `Đã lọc ${chat.participants.length - validParticipants.length} participant không hợp lệ trong hội thoại ${conversationId}`
  //       );
  //       // Lưu lại để làm sạch dữ liệu (tùy chọn, có thể bỏ nếu không muốn sửa dữ liệu ngay)
  //       chat.participants = validParticipants;
  //       await chat.save();
  //     }

  //     // Kiểm tra xem người thực hiện có trong nhóm không
  //     const currentUser = validParticipants.find((p) => p.userId?._id?.toString() === normalizedPerformerId);
  //     if (!currentUser) {
  //       logger.error(`Người dùng ${normalizedPerformerId} không phải thành viên của hội thoại ${conversationId}`);
  //       socket.emit("error", { message: "Bạn không phải thành viên của nhóm này" });
  //       return callback && callback({ success: false, message: "Bạn không phải thành viên của nhóm này" });
  //     }

  //     // Kiểm tra xem người dùng mới đã có trong nhóm chưa
  //     if (validParticipants.some((p) => p.userId?._id?.toString() === newUserId)) {
  //       logger.warn(`Người dùng ${newUserId} đã là thành viên của nhóm ${conversationId}`);
  //       socket.emit("error", { message: "Người dùng đã là thành viên của nhóm" });
  //       return callback && callback({ success: false, message: "Người dùng đã là thành viên của nhóm" });
  //     }

  //     // Kiểm tra xem userId mới có tồn tại trong collection Users không
  //     const newUser = await User.findById(newUserId).select("_id");
  //     if (!newUser) {
  //       logger.error(`Người dùng ${newUserId} không tồn tại trong hệ thống`);
  //       socket.emit("error", { message: "Người dùng không tồn tại" });
  //       return callback && callback({ success: false, message: "Người dùng không tồn tại" });
  //     }

  //     // Thêm thành viên mới
  //     chat.participants.push({
  //       userId: newUserId,
  //       role,
  //       isPinned: false,
  //       mute: null,
  //     });
  //     chat.updatedAt = new Date();
  //     const updatedChat = await chat.save().then((doc) =>
  //       doc.populate({ path: "participants.userId", select: "_id firstname surname avatar" })
  //     );

  //     // Chuẩn bị payload cho chatInfoUpdated
  //     const updatedValidParticipants = updatedChat.participants.filter(
  //       (p) => p.userId && p.userId._id && mongoose.Types.ObjectId.isValid(p.userId._id)
  //     );
  //     if (updatedValidParticipants.length !== updatedChat.participants.length) {
  //       logger.warn(
  //         `Sau khi thêm thành viên, vẫn còn ${updatedChat.participants.length - updatedValidParticipants.length} participant không hợp lệ trong hội thoại ${conversationId}`
  //       );
  //     }

  //     const chatInfoPayload = {
  //       _id: updatedChat._id,
  //       name: updatedChat.name,
  //       isGroup: updatedChat.isGroup,
  //       imageGroup: updatedChat.imageGroup,
  //       participants: updatedValidParticipants.map((p) => ({
  //         userId: p.userId._id.toString(),
  //         role: p.role,
  //         isPinned: p.isPinned,
  //         mute: p.mute,
  //       })),
  //       linkGroup: updatedChat.linkGroup,
  //       updatedAt: updatedChat.updatedAt,
  //     };

  //     // Thêm tất cả socket của người dùng mới vào phòng hội thoại
  //     const sockets = await io.fetchSockets();
  //     let joined = false;
  //     for (const s of sockets) {
  //       if (s.userId === newUserId) {
  //         s.join(conversationId);
  //         logger.info(`Socket ${s.id} của người dùng ${newUserId} đã tham gia phòng ${conversationId}`);
  //         joined = true;
  //       }
  //     }
  //     if (!joined) {
  //       logger.info(`Không tìm thấy socket đang hoạt động cho người dùng ${newUserId}`);
  //     }

  //     // Gửi sự kiện chatInfoUpdated cho tất cả thành viên hiện tại
  //     io.to(conversationId).emit("chatInfoUpdated", chatInfoPayload);

  //     // Chuẩn bị payload đầy đủ cho newGroupConversation
  //     const newGroupPayload = {
  //       _id: updatedChat._id,
  //       name: updatedChat.name,
  //       isGroup: updatedChat.isGroup,
  //       imageGroup: updatedChat.imageGroup,
  //       participants: updatedValidParticipants.map((p) => ({
  //         userId: p.userId._id.toString(),
  //         role: p.role,
  //         isPinned: p.isPinned,
  //         mute: p.mute,
  //       })),
  //       linkGroup: updatedChat.linkGroup,
  //       createdAt: updatedChat.createdAt,
  //       updatedAt: updatedChat.updatedAt,
  //       lastMessage: updatedChat.lastMessage || null,
  //       lastMessageType: updatedChat.lastMessage?.messageType || null,
  //       lastMessageSenderId: updatedChat.lastMessage?.userId || null,
  //     };

  //     // Gửi sự kiện newGroupConversation đến tất cả socket của người dùng mới
  //     sockets.forEach((s) => {
  //       if (s.userId === newUserId) {
  //         s.emit("newGroupConversation", newGroupPayload);
  //         logger.info(`Gửi newGroupConversation đến socket ${s.id} của người dùng ${newUserId} cho hội thoại ${conversationId}`);
  //       }
  //     });

  //     // Gửi phản hồi thành công
  //     const responsePayload = {
  //       success: true,
  //       data: {
  //         _id: updatedChat._id,
  //         participants: updatedValidParticipants.map((p) => ({
  //           userId: p.userId._id.toString(),
  //           role: p.role,
  //         })),
  //       },
  //     };
  //     socket.emit("addParticipantResponse", responsePayload);
  //     logger.info(`Người dùng ${newUserId} đã được thêm vào hội thoại ${conversationId} bởi ${normalizedPerformerId}`);

  //     if (callback) {
  //       callback(responsePayload);
  //     }
  //   } catch (error) {
  //     logger.error(`Lỗi khi thêm thành viên ${newUserId} vào hội thoại ${conversationId}: ${error.message}`);
  //     const errorMessage = error.message || "Không thể thêm thành viên";
  //     socket.emit("error", { message: errorMessage });
  //     socket.emit("addParticipantResponse", { success: false, message: errorMessage });
  //     if (callback) {
  //       callback({ success: false, message: errorMessage, error: error.message });
  //     }
  //   }
  // },

async  handleAddParticipant(socket, { conversationId, userId: newUserId, role = "member", performerId }, userId, io, callback) {
  try {
    // Kiểm tra và debug trạng thái của io
    if (!io || typeof io.to !== "function" || typeof io.fetchSockets !== "function") {
      logger.error("Socket.IO instance is not properly initialized", {
        ioExists: !!io,
        hasToMethod: io ? typeof io.to : "undefined",
        hasFetchSocketsMethod: io ? typeof io.fetchSockets : "undefined",
        socketId: socket.id,
        event: "addParticipant",
      });
      socket.emit("error", { message: "Lỗi máy chủ, vui lòng thử lại sau" });
      return callback && callback({ success: false, message: "Lỗi máy chủ" });
    }

    // Chuẩn hóa performerId
    const normalizedPerformerId = typeof performerId === "object"
      ? (performerId?._id || performerId?.id || String(performerId))
      : performerId;

    // Kiểm tra đầu vào
    if (!conversationId || !newUserId || !normalizedPerformerId) {
      logger.error(`Thiếu tham số`, {
        conversationId,
        newUserId,
        performerId: normalizedPerformerId,
      });
      socket.emit("error", { message: "Thiếu thông tin bắt buộc" });
      return callback && callback({ success: false, message: "Thiếu thông tin bắt buộc" });
    }

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      logger.error(`conversationId không hợp lệ: ${conversationId}`);
      socket.emit("error", { message: "ID hội thoại không hợp lệ" });
      return callback && callback({ success: false, message: "ID hội thoại không hợp lệ" });
    }
    if (!mongoose.Types.ObjectId.isValid(newUserId)) {
      logger.error(`newUserId không hợp lệ: ${newUserId}`);
      socket.emit("error", { message: "ID người dùng không hợp lệ" });
      return callback && callback({ success: false, message: "ID người dùng không hợp lệ" });
    }
    if (!mongoose.Types.ObjectId.isValid(normalizedPerformerId)) {
      logger.error(`performerId không hợp lệ: ${normalizedPerformerId}`);
      socket.emit("error", { message: "ID người thực hiện không hợp lệ" });
      return callback && callback({ success: false, message: "ID người thực hiện không hợp lệ" });
    }

    logger.info(`Người dùng ${normalizedPerformerId} đang thêm ${newUserId} vào hội thoại ${conversationId}`);

    // Tìm cuộc trò chuyện
    const chat = await Conversation.findById(conversationId);
    if (!chat) {
      logger.error(`Không tìm thấy hội thoại: ${conversationId}`);
      socket.emit("error", { message: "Không tìm thấy hội thoại" });
      return callback && callback({ success: false, message: "Không tìm thấy hội thoại" });
    }

    // Kiểm tra xem đây có phải là nhóm không
    if (!chat.isGroup) {
      logger.error(`Hội thoại ${conversationId} không phải là nhóm`);
      socket.emit("error", { message: "Chỉ nhóm mới có thể thêm thành viên" });
      return callback && callback({ success: false, message: "Chỉ nhóm mới có thể thêm thành viên" });
    }

    // Lọc participant hợp lệ
    const validParticipants = chat.participants.filter((p) => {
      const isValid = p.userId && typeof p.userId === "string" && p.userId.length > 0;
      if (!isValid) {
        logger.warn(`Participant không hợp lệ trong hội thoại ${conversationId}: userId=${p.userId || "undefined"}`, p);
      }
      return isValid;
    });

    if (validParticipants.length !== chat.participants.length) {
      logger.warn(
        `Đã lọc ${chat.participants.length - validParticipants.length} participant không hợp lệ trong hội thoại ${conversationId}`
      );
      chat.participants = validParticipants;
      await chat.save();
    }

    // Kiểm tra performerId
    let currentUser = validParticipants.find((p) => p.userId === normalizedPerformerId);
    if (!currentUser) {
      logger.warn(`Người dùng ${normalizedPerformerId} không có trong validParticipants, thêm lại với vai trò admin`);
      chat.participants.push({
        userId: normalizedPerformerId,
        role: "admin",
        isPinned: false,
        mute: null,
        isHidden: false,
      });
      await chat.save();
      currentUser = chat.participants.find((p) => p.userId === normalizedPerformerId);
      if (!currentUser) {
        logger.error(`Không thể thêm ${normalizedPerformerId} vào participants`);
        socket.emit("error", { message: "Lỗi dữ liệu, không thể xác nhận bạn là thành viên" });
        return callback && callback({ success: false, message: "Lỗi dữ liệu, không thể xác nhận bạn là thành viên" });
      }
    }

    // Kiểm tra newUserId đã là thành viên chưa
    if (validParticipants.some((p) => p.userId === newUserId)) {
      logger.warn(`Người dùng ${newUserId} đã là thành viên của nhóm ${conversationId}`);
      socket.emit("error", { message: "Người dùng đã là thành viên của nhóm" });
      return callback && callback({ success: false, message: "Người dùng đã là thành viên của nhóm" });
    }

    // Thêm thành viên mới
    chat.participants.push({
      userId: newUserId,
      role,
      isPinned: false,
      mute: null,
      isHidden: false,
    });
    chat.updatedAt = new Date();
    const updatedChat = await chat.save();

    // Chuẩn bị payload
    const updatedValidParticipants = updatedChat.participants.filter(
      (p) => p.userId && typeof p.userId === "string" && p.userId.length > 0
    );

    const chatInfoPayload = {
      _id: updatedChat._id,
      name: updatedChat.name,
      isGroup: updatedChat.isGroup,
      imageGroup: updatedChat.imageGroup,
      participants: updatedValidParticipants.map((p) => ({
        userId: p.userId,
        role: p.role,
        isPinned: p.isPinned,
        mute: p.mute,
        isHidden: p.isHidden,
      })),
      linkGroup: updatedChat.linkGroup,
      updatedAt: updatedChat.updatedAt,
    };

    const newGroupPayload = {
      _id: updatedChat._id,
      name: updatedChat.name,
      isGroup: updatedChat.isGroup,
      imageGroup: updatedChat.imageGroup,
      participants: updatedValidParticipants.map((p) => ({
        userId: p.userId,
        role: p.role,
        isPinned: p.isPinned,
        mute: p.mute,
        isHidden: p.isHidden,
      })),
      linkGroup: updatedChat.linkGroup,
      createdAt: updatedChat.createdAt,
      updatedAt: updatedChat.updatedAt,
      lastMessage: updatedChat.lastMessage || null,
      lastMessageType: updatedChat.lastMessage?.messageType || null,
      lastMessageSenderId: updatedChat.lastMessage?.userId || null,
    };

    // Gửi sự kiện tới tất cả socket của newUserId
    const sockets = await io.fetchSockets();
    let joined = false;
    for (const s of sockets) {
      if (s.handshake.query.userId === newUserId) {
        s.join(conversationId); // Đảm bảo socket tham gia phòng
        s.emit("newGroupConversation", newGroupPayload); // Gửi sự kiện nhóm mới
        logger.info(`Gửi newGroupConversation đến socket ${s.id} của người dùng ${newUserId} cho  cho hội thoại ${conversationId}`);
        joined = true;
      }
    }
    if (!joined) {
      logger.info(`Không tìm thấy socket đang hoạt động cho người dùng ${newUserId}`);
    }

    // Gửi sự kiện cập nhật thông tin nhóm tới tất cả thành viên hiện tại
    io.to(conversationId).emit("chatInfoUpdated", chatInfoPayload);

    // Gửi phản hồi thành công
    const responsePayload = {
      success: true,
      data: {
        _id: updatedChat._id,
        participants: updatedValidParticipants.map((p) => ({
          userId: p.userId,
          role: p.role,
        })),
      },
    };
    socket.emit("addParticipantResponse", responsePayload);
    logger.info(`Người dùng ${newUserId} đã được thêm vào hội thoại ${conversationId} bởi ${normalizedPerformerId}`);

    if (callback) {
      callback(responsePayload);
    }
  } catch (error) {
    logger.error(`Lỗi khi thêm thành viên ${newUserId} vào hội thoại ${conversationId}: ${error.stack}`);
    const errorMessage = error.message || "Không thể thêm thành viên";
    socket.emit("error", { message: errorMessage });
    socket.emit("addParticipantResponse", { success: false, message: errorMessage });
    if (callback) {
      callback({ success: false, message: errorMessage, error: error.message });
    }
  }
},
  // Xóa thành viên khỏi nhóm
  async handleRemoveParticipant(socket, { conversationId, userId: removeUserId }, userId, io, callback) {
    try {
      if (!conversationId || !removeUserId) {
        socket.emit("error", { message: "Thiếu ID hội thoại hoặc ID người dùng" });
        return callback && callback({ success: false, message: "Thiếu ID hội thoại hoặc ID người dùng" });
      }

      logger.info(`User ${userId} đang xóa user ${removeUserId} khỏi hội thoại ${conversationId}`);

      // Tìm cuộc trò chuyện
      const chat = await Conversation.findById(conversationId);
      if (!chat) {
        socket.emit("error", { message: "Không tìm thấy hội thoại" });
        return callback && callback({ success: false, message: "Không tìm thấy hội thoại" });
      }

      // Kiểm tra xem đây có phải là nhóm không
      if (!chat.isGroup) {
        socket.emit("error", { message: "Chỉ có thể xóa thành viên khỏi nhóm" });
        return callback && callback({ success: false, message: "Chỉ có thể xóa thành viên khỏi nhóm" });
      }

      // Kiểm tra quyền admin
      const currentUser = chat.participants.find((p) => p.userId.toString() === userId);
      if (!currentUser || currentUser.role !== "admin") {
        socket.emit("error", { message: "Bạn không có quyền xóa thành viên khỏi nhóm này" });
        return callback && callback({ success: false, message: "Bạn không có quyền xóa thành viên khỏi nhóm này" });
      }

      // Kiểm tra xem admin có đang tự xóa mình không
      if (userId === removeUserId) {
        socket.emit("error", { message: "Admin không thể tự xóa mình. Vui lòng chuyển quyền admin trước." });
        return callback && callback({ success: false, message: "Admin không thể tự xóa mình. Vui lòng chuyển quyền admin trước." });
      }

      // Kiểm tra xem người bị xóa có trong nhóm không
      const participantIndex = chat.participants.findIndex((p) => p.userId.toString() === removeUserId);
      if (participantIndex === -1) {
        socket.emit("error", { message: "Người dùng không phải là thành viên của nhóm" });
        return callback && callback({ success: false, message: "Người dùng không phải là thành viên của nhóm" });
      }

      // Xóa thành viên khỏi danh sách participants
      chat.participants.splice(participantIndex, 1);
      chat.updatedAt = new Date();
      const updatedChat = await chat.save().then((doc) => doc.populate("participants.userId"));

      // Kiểm tra io hợp lệ
      if (!io || typeof io.to !== "function") {
        logger.error("io không hợp lệ hoặc không có phương thức to");
        socket.emit("error", { message: "Lỗi server: Không thể gửi thông báo" });
        return callback && callback({ success: false, message: "Lỗi server: Không thể gửi thông báo" });
      }

      // Phát sự kiện chatInfoUpdated cho các thành viên còn lại trong nhóm
      io.to(conversationId).emit("chatInfoUpdated", {
        _id: updatedChat._id,
        name: updatedChat.name,
        isGroup: updatedChat.isGroup,
        imageGroup: updatedChat.imageGroup,
        participants: updatedChat.participants.map((p) => ({
          userId: p.userId.toString(),
          role: p.role,
          isPinned: p.isPinned,
          mute: p.mute,
        })),
        linkGroup: updatedChat.linkGroup,
        updatedAt: updatedChat.updatedAt,
      });

      // Phát sự kiện conversationRemoved cho người bị xóa
      io.to(removeUserId).emit("conversationRemoved", { conversationId });

      // Rời phòng socket của người bị xóa
      io.sockets.sockets.forEach((s) => {
        if (s.userId === removeUserId) s.leave(conversationId);
      });

      // Gửi phản hồi thành công
      socket.emit("removeParticipantResponse", { success: true, data: updatedChat });
      logger.info(`Người dùng ${removeUserId} đã bị xóa khỏi hội thoại ${conversationId} bởi ${userId}`);

      if (callback) {
        callback({ success: true, data: updatedChat });
      }
    } catch (error) {
      errorHandler(socket, "Không thể xóa thành viên", error);
      socket.emit("removeParticipantResponse", { success: false, message: "Không thể xóa thành viên" });
      if (callback) {
        callback({ success: false, message: "Không thể xóa thành viên", error: error.message });
      }
    }
  },

  // Thay đổi vai trò của thành viên
  async handleTransferGroupAdmin(socket, { conversationId, userId: newAdminUserId }, userId, io, callback) {
    try {
      logger.info(`User ${userId} transferring group admin role to user ${newAdminUserId} in conversation ${conversationId}`);

      // Tìm conversation và populate participants.userId
      const conversation = await Conversation.findById(conversationId).populate("participants.userId");
      if (!conversation) {
        socket.emit("error", { message: "Conversation not found" });
        return callback && callback({ success: false, message: "Conversation not found" });
      }

      // Kiểm tra participants
      if (!conversation.participants || !Array.isArray(conversation.participants)) {
        socket.emit("error", { message: "Invalid participants data" });
        return callback && callback({ success: false, message: "Invalid participants data" });
      }

      // Kiểm tra quyền: Chỉ admin hiện tại mới được chuyển quyền
      const currentAdmin = conversation.participants.find(
        (p) => p.userId && p.userId.toString() === userId && p.role === "admin"
      );
      if (!currentAdmin) {
        socket.emit("error", { message: "You are not authorized to transfer admin role" });
        return callback && callback({ success: false, message: "You are not authorized to transfer admin role" });
      }

      // Kiểm tra xem người dùng mới có trong nhóm không
      const newAdmin = conversation.participants.find(
        (p) => p.userId && p.userId.toString() === newAdminUserId
      );
      if (!newAdmin) {
        socket.emit("error", { message: "New admin user not found in conversation" });
        return callback && callback({ success: false, message: "New admin user not found in conversation" });
      }

      // Cập nhật vai trò
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

      // Lấy thông tin conversation đã cập nhật
      const updatedConversation = await Conversation.findById(conversationId).populate("participants.userId");
      if (!updatedConversation) {
        socket.emit("error", { message: "Failed to fetch updated conversation" });
        return callback && callback({ success: false, message: "Failed to fetch updated conversation" });
      }

      // Chuẩn bị dữ liệu cho sự kiện chatInfoUpdated
      const chatInfo = {
        _id: conversationId,
        name: updatedConversation.name,
        isGroup: updatedConversation.isGroup,
        imageGroup: updatedConversation.imageGroup,
        participants: updatedConversation.participants.map(p => ({
          userId: p.userId ? p.userId.toString() : null,
          role: p.role,
          isHidden: p.isHidden,
          mute: p.mute,
          isPinned: p.isPinned
        })),
        linkGroup: updatedConversation.linkGroup,
        updatedAt: updatedConversation.updatedAt
      };

      // Phát sự kiện chatInfoUpdated tới tất cả thành viên trong nhóm
      io.to(conversationId).emit("chatInfoUpdated", chatInfo);
      logger.info(`Admin role transferred to user ${newAdminUserId} in conversation ${conversationId}`);

      // Gửi phản hồi callback
      if (callback) {
        callback({ success: true, data: chatInfo });
      }
    } catch (error) {
      logger.error(`Failed to transfer group admin role: ${error.message}`, error);
      const errorMessage = error.message.includes("undefined")
        ? "Invalid user data in participants"
        : "Failed to transfer group admin role";
      socket.emit("error", { message: errorMessage, error: error.message });
      if (callback) {
        callback({ success: false, message: errorMessage });
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

  // Ghim cuộc trò chuyện
async handlePinChat(socket, { conversationId, isPinned }, userId, io, callback) {
  try {
    if (typeof isPinned !== "boolean") {
      socket.emit("error", { message: "isPinned must be a boolean" });
      return callback && callback({ success: false, message: "isPinned must be a boolean" });
    }

    // Nếu yêu cầu ghim, kiểm tra giới hạn
    if (isPinned) {
      const pinnedCount = await Conversation.countDocuments({
        "participants": {
          $elemMatch: {
            userId: userId,
            isPinned: true,
          },
        },
      });

      if (pinnedCount >= 5) {
        socket.emit("error", { message: "Bạn chỉ có thể ghim tối đa 5 cuộc trò chuyện!" });
        return callback && callback({
          success: false,
          message: "Bạn chỉ có thể ghim tối đa 5 cuộc trò chuyện!",
        });
      }
    }

    logger.info(`User ${userId} pinning conversation ${conversationId} with status ${isPinned}`);
    const chat = await Conversation.findOneAndUpdate(
      { _id: conversationId, "participants.userId": userId },
      { $set: { "participants.$.isPinned": isPinned, updatedAt: new Date() } },
      { new: true }
    ).lean();

    if (!chat) {
      socket.emit("error", { message: "Conversation not found" });
      return callback && callback({ success: false, message: "Conversation not found" });
    }

    const payload = {
      _id: chat._id,
      name: chat.name,
      isGroup: chat.isGroup,
      imageGroup: chat.imageGroup,
      participants: chat.participants,
      updatedAt: chat.updatedAt,
    };

    // Phát sự kiện tới phòng của cuộc trò chuyện
    logger.info(`Emitting chatInfoUpdated to room ${conversationId}:`, payload);
    io.to(conversationId).emit("chatInfoUpdated", payload);

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

async handleUpdateNotification(socket, { conversationId, mute }, userId, io, callback) {
  try {
    // Kiểm tra giá trị mute hợp lệ theo schema
    const validMuteValues = ["1h", "4h", "8am", "forever", null];
    if (!validMuteValues.includes(mute)) {
      socket.emit("error", { message: "mute phải là một trong: '1h', '4h', '8am', 'forever', hoặc null" });
      return callback && callback({ success: false, message: "mute phải là một trong: '1h', '4h', '8am', 'forever', hoặc null" });
    }

    logger.info(`Người dùng ${userId} đang cập nhật cài đặt thông báo cho cuộc trò chuyện ${conversationId} với mute=${mute}`);

    // Cập nhật trạng thái mute
    const chat = await Conversation.findOneAndUpdate(
      { _id: conversationId, "participants.userId": userId },
      { $set: { "participants.$.mute": mute, updatedAt: new Date() } }, // Sửa updateAt thành updatedAt
      { new: true }
    ).lean();

    if (!chat) {
      socket.emit("error", { message: "Không tìm thấy cuộc trò chuyện" });
      return callback && callback({ success: false, message: "Không tìm thấy cuộc trò chuyện" });
    }

    const payload = {
      _id: chat._id,
      name: chat.name,
      isGroup: chat.isGroup,
      imageGroup: chat.imageGroup,
      participants: chat.participants,
      updatedAt: chat.updatedAt, // Sửa updateAt thành updatedAt
    };

    // Phát sự kiện tới phòng cuộc trò chuyện
    logger.info(`Phát sự kiện chatInfoUpdated tới phòng ${conversationId}:`, payload);
    io.to(conversationId).emit("chatInfoUpdated", payload);

    logger.info(`Cài đặt thông báo đã được cập nhật cho người dùng ${userId} trong cuộc trò chuyện ${conversationId} với mute=${mute}`);
    if (callback) {
      callback({ success: true, data: chat });
    }
  } catch (error) {
    logger.error("Lỗi khi cập nhật cài đặt thông báo:", error);
    errorHandler(socket, "Không thể cập nhật cài đặt thông báo", error);
    if (callback) {
      callback({ success: false, message: "Không thể cập nhật cài đặt thông báo" });
    }
  }
},
  // Ẩn trò chuyện
  // Ẩn trò chuyện
  async handleHideChat(socket, { conversationId, isHidden, pin }, userId, io, callback) {
    try {
      if (!conversationId || typeof isHidden !== "boolean") {
        socket.emit("error", { message: "Thiếu hoặc dữ liệu không hợp lệ" });
        return callback && callback({ success: false, message: "Thiếu hoặc dữ liệu không hợp lệ" });
      }

      const chat = await Conversation.findById(conversationId);
      if (!chat) {
        socket.emit("error", { message: "Không tìm thấy cuộc trò chuyện" });
        return callback && callback({ success: false, message: "Không tìm thấy cuộc trò chuyện" });
      }

      const participant = chat.participants.find((p) => p.userId.toString() === userId);
      if (!participant) {
        socket.emit("error", { message: "Bạn không phải là thành viên của cuộc trò chuyện" });
        return callback && callback({ success: false, message: "Bạn không phải là thành viên của cuộc trò chuyện" });
      }

      if (isHidden && pin && (!/^\d{4}$/.test(pin))) {
        socket.emit("error", { message: "Mã PIN phải là 4 chữ số" });
        return callback && callback({ success: false, message: "Mã PIN phải là 4 chữ số" });
      }

      participant.isHidden = isHidden;
      participant.pin = isHidden ? pin : null;
      chat.updatedAt = new Date();

      await chat.save();

      io.to(conversationId).emit("chatInfoUpdated", {
        _id: chat._id,
        name: chat.name,
        isGroup: chat.isGroup,
        imageGroup: chat.imageGroup,
        participants: chat.participants,
        linkGroup: chat.linkGroup,
        updatedAt: chat.updatedAt,
      });

      // Phát sự kiện chatHidden để thông báo client cập nhật danh sách
      socket.emit("chatHidden", {
        conversationId,
        isHidden,
      });

      logger.info(`User ${userId} ${isHidden ? "hid" : "unhid"} conversation ${conversationId}`);
      callback && callback({ success: true, data: chat });
    } catch (error) {
      errorHandler(socket, "Lỗi khi ẩn/hiện trò chuyện", error);
      callback && callback({ success: false, message: "Lỗi khi ẩn/hiện trò chuyện" });
    }
  },

  // verifyPin
  async handleVerifyPin(socket, payload, callback) {
    console.log("Inside handleVerifyPin. Type of callback:", typeof callback);
    try {
      const { conversationId, userId, pin } = payload;

      const chat = await Conversation.findById(conversationId);
      if (!chat) {
        return typeof callback === "function" && callback({ success: false, message: "Không tìm thấy cuộc trò chuyện" });
      }

      const participant = chat.participants.find((p) => p.userId.toString() === userId);
      if (!participant) {
        return typeof callback === "function" && callback({ success: false, message: "Bạn không phải là thành viên của cuộc trò chuyện" });
      }

      if (!participant.isHidden) {
        return typeof callback === "function" && callback({ success: true, message: "Cuộc trò chuyện không bị ẩn" });
      }

      if (participant.pin !== pin) {
        return typeof callback === "function" && callback({ success: false, message: "Mã PIN không đúng" });
      }

      typeof callback === "function" && callback({ success: true, message: "Xác thực PIN thành công" });
    } catch (error) {
      console.error("Lỗi khi xác thực PIN:", error);
      typeof callback === "function" && callback({ success: false, message: "Lỗi khi xác thực PIN" });
    }
  },  

async  handleDeleteAllChatHistory(socket, { conversationId }, userId, io, callback) {
  try {
    logger.info(`Người dùng ${userId} đang xóa toàn bộ tin nhắn cho cuộc trò chuyện ${conversationId}`);

    // Tìm cuộc trò chuyện
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      socket.emit("error", { message: "Không tìm thấy cuộc trò chuyện" });
      return callback?.({ success: false, message: "Không tìm thấy cuộc trò chuyện" });
    }

    // Kiểm tra xem người dùng có trong cuộc trò chuyện không
    const participant = conversation.participants.find(
      (p) => p.userId.toString() === userId
    );
    if (!participant) {
      socket.emit("error", { message: "Người dùng không có trong cuộc trò chuyện này" });
      return callback?.({ success: false, message: "Người dùng không có trong cuộc trò chuyện này" });
    }

    logger.info(`Cập nhật tin nhắn cho cuộc trò chuyện ${conversationId} bởi người dùng ${userId}`);
    // Đánh dấu tất cả tin nhắn là đã xóa bởi userId
    await Message.updateMany(
      { conversationId },
      { $addToSet: { deletedBy: userId } }
    );

    // Tìm tin nhắn cuối cùng chưa bị xóa bởi userId
    const lastValidMessage = await Message.findOne({
      conversationId,
      isRevoked: false,
      deletedBy: { $ne: userId },
    }).sort({ createdAt: -1 });

    // Cập nhật lastMessage và updatedAt của cuộc trò chuyện
    conversation.lastMessage = lastValidMessage ? lastValidMessage._id : null;
    conversation.updatedAt = new Date();
    await conversation.save();

    // Phát sự kiện deleteAllChatHistory đến tất cả socket của người dùng qua phòng
    io.to(`user:${userId}`).emit("deleteAllChatHistory", { conversationId, deletedBy: userId });
    logger.info(`Đã phát sự kiện deleteAllChatHistory đến phòng user:${userId}`);

    // Phát sự kiện conversationUpdated đến toàn bộ phòng (tất cả thành viên trong cuộc trò chuyện)
    io.to(conversationId).emit("conversationUpdated", {
      conversationId,
      lastMessage: lastValidMessage || null,
      updatedAt: conversation.updatedAt,
    });
    logger.info(`Đã phát sự kiện conversationUpdated đến phòng ${conversationId}`);

    logger.info(`Toàn bộ tin nhắn đã được xóa cho người dùng ${userId} trong cuộc trò chuyện ${conversationId}`);
    callback?.({ success: true, data: { conversationId } });
  } catch (error) {
    logger.error(`Không thể xóa tin nhắn cho cuộc trò chuyện ${conversationId}`, error);
    socket.emit("error", { message: "Không thể xóa toàn bộ tin nhắn" });
    callback?.({ success: false, message: "Không thể xóa toàn bộ tin nhắn" });
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

      // Kiểm tra đầu vào
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
      const message = await Message.findById(messageId).select(
        "conversationId userId linkURL messageType isRevoked"
      );
      if (!message) {
        logger.error(`Message not found: ${messageId}`);
        socket.emit("error", { message: "Message not found" });
        if (typeof callback === "function") {
          callback({ success: false, message: "Message not found" });
        }
        return;
      }

      // Kiểm tra tin nhắn đã bị thu hồi
      if (message.isRevoked) {
        logger.error(`Message ${messageId} is already revoked`);
        socket.emit("error", { message: "Cannot delete a revoked message" });
        if (typeof callback === "function") {
          callback({ success: false, message: "Cannot delete a revoked message" });
        }
        return;
      }

      // // Kiểm tra quyền xóa (chỉ người gửi được xóa)
      // if (message.userId.toString() !== userId) {
      //   logger.error(`User ${userId} is not the sender of message ${messageId}`);
      //   socket.emit("error", { message: "You are not authorized to delete this message" });
      //   if (typeof callback === "function") {
      //     callback({
      //       success: false,
      //       message: "You are not authorized to delete this message",
      //     });
      //   }
      //   return;
      // }

      // Kiểm tra conversationId
      if (!message.conversationId || !mongoose.isValidObjectId(message.conversationId)) {
        logger.error(`Invalid conversationId in message ${messageId}`);
        socket.emit("error", { message: "Invalid conversation ID" });
        if (typeof callback === "function") {
          callback({ success: false, message: "Invalid conversation ID" });
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

      // Kiểm tra người dùng là participant
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

      // Kiểm tra urlIndex hợp lệ
      if (!message.linkURL || urlIndex >= message.linkURL.length) {
        logger.error(`urlIndex ${urlIndex} is invalid for message ${messageId}`);
        socket.emit("error", { message: "Invalid URL index for this message" });
        if (typeof callback === "function") {
          callback({ success: false, message: "Invalid URL index for this message" });
        }
        return;
      }

      let isMessageDeleted = false;

      // Xóa URL hoặc toàn bộ tin nhắn
      if (message.linkURL.length > 1) {
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
        logger.info(`Removed URL at index ${urlIndex} from message ${messageId}`);
      } else {
        // Xóa toàn bộ tin nhắn
        await Message.deleteOne({ _id: messageId });
        isMessageDeleted = true;
        logger.info(`Deleted message ${messageId} because it has only one URL`);
      }

      // Kiểm tra nếu tin nhắn vẫn tồn tại
      const updatedMessage = isMessageDeleted
        ? null
        : await Message.findById(messageId).select("linkURL conversationId messageType");

      // Cập nhật lastMessage của cuộc trò chuyện
      const lastValidMessage = await Message.findOne({
        conversationId: message.conversationId,
        isRevoked: false,
        linkURL: { $exists: true, $ne: [] },
      }).sort({ createdAt: -1 });

      conversation.lastMessage = lastValidMessage ? lastValidMessage._id : null;
      conversation.updatedAt = new Date();
      await conversation.save();

      // Phát sự kiện messageDeleted (cho cả hai trường hợp)
      io.to(message.conversationId.toString()).emit("messageDeleted", {
        messageId,
        urlIndex,
        isMessageDeleted,
        conversationId: message.conversationId.toString(),
      });
      logger.info(`Emitted messageDeleted`, {
        messageId,
        urlIndex,
        isMessageDeleted,
        conversationId: message.conversationId,
      });

      // Phát sự kiện conversationUpdated
      io.to(message.conversationId.toString()).emit("conversationUpdated", {
        conversationId: message.conversationId.toString(),
        lastMessage: lastValidMessage || null,
        updatedAt: conversation.updatedAt,
      });

      // Phát sự kiện updateChatInfo
      io.to(message.conversationId.toString()).emit("updateChatInfo", {
        conversationId: message.conversationId.toString(),
        messageType: message.messageType,
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

      // Trả về callback
      if (typeof callback === "function") {
        callback({
          success: true,
          data: { messageId, urlIndex, isMessageDeleted },
        });
      }
    } catch (error) {
      logger.error(`Failed to delete URL at index ${urlIndex} of message ${messageId}: ${error.message}`);
      socket.emit("error", { message: "Failed to delete URL", error: error.message });
      if (typeof callback === "function") {
        callback({ success: false, message: "Failed to delete URL", error: error.message });
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
  async handleLeaveGroup(socket, { conversationId, userId }, io, callback) {
    try {
      if (!conversationId || !userId) {
        socket.emit("error", { message: "Thiếu ID cuộc trò chuyện hoặc ID người dùng" });
        return callback && callback({ success: false, message: "Thiếu ID cuộc trò chuyện hoặc ID người dùng" });
      }

      logger.info(`Người dùng ${userId} đang cố gắng rời cuộc trò chuyện ${conversationId}`);
      const chat = await Conversation.findById(conversationId);
      if (!chat) {
        socket.emit("error", { message: "Không tìm thấy cuộc trò chuyện" });
        return callback && callback({ success: false, message: "Không tìm thấy cuộc trò chuyện" });
      }

      if (!chat.isGroup) {
        socket.emit("error", { message: "Đây không phải là cuộc trò chuyện nhóm" });
        return callback && callback({ success: false, message: "Đây không phải là cuộc trò chuyện nhóm" });
      }

      const currentUser = chat.participants.find((p) => p.userId.toString() === userId);
      if (!currentUser) {
        socket.emit("error", { message: "Bạn không phải là thành viên của cuộc trò chuyện này" });
        return callback && callback({ success: false, message: "Bạn không phải là thành viên của cuộc trò chuyện này" });
      }

      // Kiểm tra nếu người dùng là admin
      if (currentUser.role === "admin") {
        const otherParticipants = chat.participants.filter((p) => p.userId.toString() !== userId);
        if (otherParticipants.length === 0) {
          // Nếu chỉ còn admin, giải tán nhóm
          await Conversation.findByIdAndDelete(conversationId);
          io.to(conversationId).emit("groupDisbanded", { conversationId });
          logger.info(`Cuộc trò chuyện ${conversationId} đã bị giải tán vì admin cuối cùng ${userId} rời đi`);
          return callback && callback({ success: true, message: "Nhóm đã giải tán vì chỉ còn một thành viên" });
        }

        socket.emit("error", { message: "Admin phải chuyển quyền quản trị trước khi rời" });
        return callback && callback({ success: false, message: "Admin phải chuyển quyền quản trị trước khi rời" });
      }

      // Xóa người dùng khỏi nhóm
      const updatedChat = await Conversation.findByIdAndUpdate(
        conversationId,
        { $pull: { participants: { userId } }, updatedAt: new Date() },
        { new: true }
      ).populate("participants.userId");

      if (!updatedChat) {
        socket.emit("error", { message: "Không thể cập nhật cuộc trò chuyện" });
        return callback && callback({ success: false, message: "Không thể cập nhật cuộc trò chuyện" });
      }

      // Gửi sự kiện chatInfoUpdated với đầy đủ thông tin
      io.to(conversationId).emit("chatInfoUpdated", {
        _id: updatedChat._id,
        name: updatedChat.name,
        isGroup: updatedChat.isGroup,
        imageGroup: updatedChat.imageGroup,
        participants: updatedChat.participants.map((p) => ({
          userId: p.userId.toString(),
          role: p.role,
          isPinned: p.isPinned,
          mute: p.mute,
        })),
        linkGroup: updatedChat.linkGroup,
        updatedAt: updatedChat.updatedAt,
      });

      // Gửi sự kiện groupLeft tới các thành viên còn lại
      io.to(conversationId).emit("groupLeft", {
        conversationId,
        userId,
      });

      // Gửi sự kiện conversationRemoved tới người rời
      io.to(userId).emit("conversationRemoved", { conversationId });

      logger.info(`Người dùng ${userId} đã rời cuộc trò chuyện ${conversationId}`);

      if (callback) {
        callback({ success: true, data: updatedChat });
      }
    } catch (error) {
      errorHandler(socket, "Không thể rời nhóm", error);
      if (callback) {
        callback({ success: false, message: "Không thể rời nhóm" });
      }
    }
  },

  async handleGetOrCreatePrivateConversation(socket, { userId1, userId2 }, currentUserId, io, callback) {
    try {
      // Kiểm tra đầu vào
      if (!userId1 || !userId2 || userId1 === userId2 || typeof userId1 !== "string" || typeof userId2 !== "string") {
        logger.error(`Invalid input: userId1=${userId1}, userId2=${userId2}`);
        socket.emit("error", { message: "Invalid user IDs or same user" });
        return callback && callback({ success: false, message: "Invalid user IDs or same user" });
      }

      if (currentUserId !== userId1) {
        logger.error(`Unauthorized: currentUserId=${currentUserId} does not match userId1=${userId1}`);
        socket.emit("error", { message: "Unauthorized request" });
        return callback && callback({ success: false, message: "Unauthorized request" });
      }

      // Kiểm tra xem userId1 và userId2 có tồn tại trong collection users
      const usersExist = await User.find({ _id: { $in: [userId1, userId2] } }).select("_id");
      if (usersExist.length !== 2) {
        logger.error(`One or both users do not exist: userId1=${userId1}, userId2=${userId2}`);
        socket.emit("error", { message: "One or both users do not exist" });
        return callback && callback({ success: false, message: "One or both users do not exist" });
      }

      logger.info(`User ${userId1} requesting private conversation with ${userId2}`);

      // Tìm hội thoại cá nhân đã tồn tại
      let conversation = await Conversation.findOne({
        isGroup: false,
        participants: {
          $all: [
            { $elemMatch: { userId: userId1 } },
            { $elemMatch: { userId: userId2 } },
          ],
          $size: 2, // Chỉ có 2 người tham gia
        },
      }).populate("lastMessage");

      // Nếu không tìm thấy, tạo hội thoại mới
      if (!conversation) {
        logger.info(`No existing private conversation found between ${userId1} and ${userId2}. Creating new one.`);

        conversation = new Conversation({
          isGroup: false,
          participants: [
            { userId: userId1, role: "member", isPinned: false, mute: null, isHidden: false },
            { userId: userId2, role: "member", isPinned: false, mute: null, isHidden: false },
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        await conversation.save();
      }

      // Tham gia phòng socket cho người gửi
      socket.join(conversation._id.toString());
      logger.info(`Socket ${socket.id} joined room ${conversation._id}`);

      // Tìm socket của userId2 và cho họ tham gia phòng nếu đang online
      const sockets = await io.fetchSockets();
      for (const s of sockets) {
        if (s.userId === userId2) {
          s.join(conversation._id.toString());
          logger.info(`Socket ${s.id} of user ${userId2} joined room ${conversation._id}`);
        }
      }

      // Chuẩn bị payload trả về
      const payload = {
        _id: conversation._id.toString(),
        isGroup: conversation.isGroup,
        participants: conversation.participants.map((p) => ({
          userId: p.userId,
          role: p.role,
          isPinned: p.isPinned,
          mute: p.mute,
          isHidden: p.isHidden || false,
        })),
        lastMessage: conversation.lastMessage
          ? {
            _id: conversation.lastMessage._id.toString(),
            content: conversation.lastMessage.content,
            messageType: conversation.lastMessage.messageType,
            userId: conversation.lastMessage.userId || null,
            createdAt: conversation.lastMessage.createdAt,
          }
          : null,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      };

      // Gửi sự kiện newGroupConversation cho userId2 (nếu là hội thoại mới)
      if (!conversation.lastMessage) {
        io.to(userId2).emit("newGroupConversation", payload);
        logger.info(`Emitted newGroupConversation to user ${userId2} for conversation ${conversation._id}`);
      }

      // Gửi phản hồi cho client
      socket.emit("privateConversation", payload);
      logger.info(`Private conversation ${conversation._id} sent to user ${userId1}`);

      if (callback) {
        callback({ success: true, conversation: payload });
      }
    } catch (error) {
      logger.error(`Failed to get or create private conversation: ${error.message}`);
      errorHandler(socket, "Failed to get or create private conversation", error);
      if (callback) {
        callback({ success: false, message: "Failed to get or create private conversation", error: error.message });
      }
    }
  },
};