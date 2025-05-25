const Message = require("../../../models/Message");
const Conversation = require("../../../models/Conversation");
const logger = require("../../../utils/logger");
const errorHandler = require("../../../utils/errorHandler");
const mongoose = require("mongoose");
//Giang
const sendMessageToQueue = require("../../../rabbitmq/producer");

module.exports = {
  // Xử lý gửi tin nhắn
  // async handleSendMessage(socket, { conversationId, message }, userId, io) {
  //   if (!conversationId || !message) {
  //     return errorHandler(socket, "Invalid message data");
  //   }

  //   if (!message.content?.trim() && message.messageType === "text") {
  //     return errorHandler(socket, "Text message cannot be empty");
  //   }

  //   if (
  //     ["image", "file", "video"].includes(message.messageType) &&
  //     !message.linkURL
  //   ) {
  //     return errorHandler(socket, "File message must have a linkURL");
  //   }

  //   try {
  //     const newMessage = new Message({
  //       conversationId,
  //       userId,
  //       content: message.content?.trim() || "",
  //       messageType: message.messageType,
  //       replyMessageId: message.replyMessageId || null,
  //       isRevoked: false,
  //       deletedBy: [],
  //       linkURL: message.linkURL || [],
  //       status: {
  //         sent: true,
  //         receivedBy: [],
  //         readBy: [],
  //       },
  //       createdAt: new Date(),
  //     });

  //     const savedMessage = await newMessage.save();
  //     logger.info(`Message saved: ${savedMessage._id}`);

  //     // Cập nhật tin nhắn cuối trong cuộc trò chuyện
  //     const conversation = await Conversation.findById(conversationId);
  //     if (conversation) {
  //       conversation.lastMessage = savedMessage._id;
  //       conversation.updatedAt = new Date();
  //       await conversation.save();
  //       logger.info(`Conversation updated: ${conversationId}`);

  //       //Gửi vào hàng đợi RabbitMQ
  //       // await sendMessageToQueue({
  //       //     userId,
  //       //     conversationId,
  //       //     messageId: savedMessage._id,
  //       //     content: savedMessage.content,
  //       //     createdAt: savedMessage.createdAt,
  //       // });

  //       const recipients = conversation.participants.filter(
  //           (participant) => participant.userId.toString() !== userId.toString()
  //         );
  //         console.log("Recipients:", recipients);
  //         // Gửi thông báo cho từng người nhận
  //         for (const recipient of recipients) {
  //           const recipientId = recipient.userId; // Lấy userId của người nhận
          
  //           await sendMessageToQueue({
  //             userId: recipientId,  // Gửi đến userId của người nhận
  //             conversationId,
  //             messageId: savedMessage._id,
  //             //content: savedMessage.content,
  //             content: `Bạn có tin nhắn mới`,
  //             createdAt: savedMessage.createdAt,
  //             typeNotice: "new_message",
  //             data: {
  //               screen: "ChatScreen",
  //               type: "chat",
  //             },
  //           });
  //           console.log("Sending to recipientId:", recipient.userId);
  //           console.log(`Message sent to recipient: ${recipientId}`);
  //         }
  //       // Emit các sự kiện
  //       socket.to(conversationId).emit("receiveMessage", savedMessage);
  //       socket.emit("messageSent", savedMessage);

  //       // Emit thông tin cập nhật cuộc trò chuyện cho tất cả người dùng
  //       io.to(conversationId).emit("conversationUpdated", {
  //         conversationId,
  //         lastMessage: savedMessage,
  //         updatedAt: conversation.updatedAt,
  //       });
  //     }
  //   } catch (error) {
  //     errorHandler(socket, "Failed to send message", error);
  //   }
  // },

  async handleSendMessage(socket, { conversationId, message }, userId, io) {
  if (!conversationId || !message) {
    return errorHandler(socket, "Invalid message data");
  }

  if (!message.content?.trim() && message.messageType === "text") {
    return errorHandler(socket, "Text message cannot be empty");
  }

  if (
    ["image", "file", "video", "link"].includes(message.messageType) &&
    !message.linkURL
  ) {
    return errorHandler(socket, "File message must have a linkURL");
  }

  try {
    // Tạo và lưu tin nhắn mới
    const newMessage = new Message({
      conversationId,
      userId,
      content: message.content?.trim() || "",
      messageType: message.messageType,
      replyMessageId: message.replyMessageId || null,
      isRevoked: false,
      deletedBy: [],
      linkURL: message.linkURL || [],
      status: {
        sent: true,
        receivedBy: [],
        readBy: [],
      },
      createdAt: new Date(),
    });

    const savedMessage = await newMessage.save();
    logger.info(`Message saved: ${savedMessage._id}`, {
      timestamp: savedMessage.createdAt,
    });

    // Cập nhật tin nhắn cuối trong cuộc trò chuyện
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return errorHandler(socket, "Conversation not found");
    }

    conversation.lastMessage = savedMessage._id;
    conversation.updatedAt = new Date();
    await conversation.save();
    logger.info(`Conversation updated: ${conversationId}`, {
      timestamp: conversation.updatedAt,
    });

    // Gửi vào hàng đợi RabbitMQ (với cơ chế xử lý lỗi)
    const recipients = conversation.participants.filter(
      (participant) => participant.userId.toString() !== userId.toString()
    );
    console.log("Recipients:", recipients);

    for (const recipient of recipients) {
      const recipientId = recipient.userId;
      try {
        await sendMessageToQueue({
          userId: recipientId,
          conversationId,
          messageId: savedMessage._id,
          content: `Bạn có tin nhắn mới`,
          createdAt: savedMessage.createdAt,
          typeNotice: "new_message",
          data: {
            screen: "ChatScreen",
            type: "chat",
          },
        });

        //Send socket real-time to mobile
          io.to(recipientId.toString()).emit("new_notification", {
            typeNotice: "new_message",
            content: `Bạn có tin nhắn mới `,
            conversationId,
            messageId: savedMessage._id,
            createdAt: savedMessage.createdAt,
          });

          console.log("Socket Notification sent to recipientId:", recipientId);



        console.log(`Message sent to queue for recipient: ${recipientId}`);
      } catch (error) {
        console.error(`Error sending message to queue for recipient ${recipientId}:`, error);
        // Tiếp tục xử lý, không làm gián đoạn gửi socket
      }
      console.log(`Sending to recipientId: ${recipientId}`);
      console.log(`Message sent to recipient: ${recipientId}`);
    }

    // Emit các sự kiện socket
    socket.to(conversationId).emit("receiveMessage", savedMessage);
    socket.emit("messageSent", savedMessage);

    // Emit thông tin cập nhật cuộc trò chuyện
    io.to(conversationId).emit("conversationUpdated", {
      conversationId,
      lastMessage: savedMessage,
      updatedAt: conversation.updatedAt,
    });

    // Emit sự kiện updateChatInfo cho tất cả client trong phòng
    if (["image", "video", "file", "link"].includes(savedMessage.messageType)) {
      io.to(conversationId).emit("updateChatInfo", {
        conversationId,
        messageType: savedMessage.messageType,
      });
      logger.info(`Emitted updateChatInfo for conversation: ${conversationId}, messageType: ${savedMessage.messageType}`);
    }

  } catch (error) {
    errorHandler(socket, "Failed to send message", error);
  }
},

  // Xử lý xóa tin nhắn
  // Xử lý xóa tin nhắn
async handleDeleteMessage(socket, { messageId }, userId, io, callback) {
  try {
    // 1. Ghi log thông tin đầu vào
    logger.info(`Gọi handleDeleteMessage với:`, {
      messageId,
      userId,
      hasIo: !!io,
      hasCallback: !!callback,
      callbackType: typeof callback,
    });

    // 2. Kiểm tra đầu vào
    if (!mongoose.isValidObjectId(messageId)) {
      logger.error(`ID tin nhắn không hợp lệ: ${messageId}`);
      socket.emit("error", { message: "ID tin nhắn không hợp lệ" });
      if (typeof callback === "function") {
        callback({ success: false, message: "ID tin nhắn không hợp lệ" });
      }
      return;
    }

    if (!userId || typeof userId !== "string") {
      logger.error(`ID người dùng không hợp lệ: ${userId}`);
      socket.emit("error", { message: "ID người dùng không hợp lệ" });
      if (typeof callback === "function") {
        callback({ success: false, message: "ID người dùng không hợp lệ" });
      }
      return;
    }

    // 3. Tìm tin nhắn
    const message = await Message.findById(messageId).select(
      "conversationId userId linkURL messageType isRevoked deletedBy content"
    );
    if (!message) {
      logger.error(`Không tìm thấy tin nhắn: ${messageId}`);
      socket.emit("error", { message: "Không tìm thấy tin nhắn" });
      if (typeof callback === "function") {
        callback({ success: false, message: "Không tìm thấy tin nhắn" });
      }
      return;
    }

    // 4. Kiểm tra tin nhắn đã bị thu hồi
    if (message.isRevoked) {
      logger.error(`Tin nhắn ${messageId} đã bị thu hồi`);
      socket.emit("error", { message: "Không thể xóa tin nhắn đã thu hồi" });
      if (typeof callback === "function") {
        callback({ success: false, message: "Không thể xóa tin nhắn đã thu hồi" });
      }
      return;
    }

    // 5. Kiểm tra conversationId
    if (!message.conversationId || !mongoose.isValidObjectId(message.conversationId)) {
      logger.error(`ID cuộc trò chuyện không hợp lệ trong tin nhắn ${messageId}`);
      socket.emit("error", { message: "ID cuộc trò chuyện không hợp lệ" });
      if (typeof callback === "function") {
        callback({ success: false, message: "ID cuộc trò chuyện không hợp lệ" });
      }
      return;
    }

    // 6. Tìm cuộc trò chuyện
    const conversation = await Conversation.findById(message.conversationId);
    if (!conversation) {
      logger.error(`Không tìm thấy cuộc trò chuyện: ${message.conversationId}`);
      socket.emit("error", { message: "Không tìm thấy cuộc trò chuyện" });
      if (typeof callback === "function") {
        callback({ success: false, message: "Không tìm thấy cuộc trò chuyện" });
      }
      return;
    }

    // 7. Kiểm tra người dùng là thành viên
    const isParticipant = conversation.participants.some(
      (participant) => participant.userId === userId
    );
    if (!isParticipant) {
      logger.error(`Người dùng ${userId} không phải thành viên của cuộc trò chuyện ${message.conversationId}`);
      socket.emit("error", { message: "Bạn không có quyền xóa tin nhắn trong cuộc trò chuyện này" });
      if (typeof callback === "function") {
        callback({ success: false, message: "Bạn không có quyền xóa tin nhắn trong cuộc trò chuyện này" });
      }
      return;
    }

    // 8. Thêm userId vào deletedBy
    const updateResult = await Message.updateOne(
      { _id: messageId },
      { $addToSet: { deletedBy: userId } }
    );

    if (updateResult.modifiedCount === 0) {
      logger.error(`Không thể thêm ${userId} vào deletedBy cho tin nhắn ${messageId}`);
      socket.emit("error", { message: "Không thể xóa tin nhắn" });
      if (typeof callback === "function") {
        callback({ success: false, message: "Không thể xóa tin nhắn" });
      }
      return;
    }
    logger.info(`Đã thêm ${userId} vào deletedBy cho tin nhắn ${messageId}`);

    // 9. Cập nhật lastMessage của cuộc trò chuyện
    const lastValidMessage = await Message.findOne({
      conversationId: message.conversationId,
      isRevoked: false,
      deletedBy: { $ne: userId },
    }).sort({ createdAt: -1 });

    conversation.lastMessage = lastValidMessage ? lastValidMessage._id : null;
    conversation.updatedAt = new Date();
    await conversation.save();

    // 10. Phát sự kiện messageDeleted tới tất cả thiết bị của userId và phòng conversation
    const messageDeletedPayload = {
      messageId: messageId.toString(),
      conversationId: message.conversationId.toString(),
      isMessageDeleted: true,
      deletedBy: userId,
      urlIndex: null, // Không xóa URL cụ thể trong hàm này
    };

    // Phát tới tất cả thiết bị của người dùng (bao gồm thiết bị hiện tại)
    io.to(`user-${userId}`).emit("messageDeleted", messageDeletedPayload);
    // Phát tới tất cả thành viên trong cuộc trò chuyện
    io.to(message.conversationId.toString()).emit("messageDeleted", messageDeletedPayload);
    logger.info(`Đã phát sự kiện messageDeleted`, messageDeletedPayload);

    // 11. Phát sự kiện conversationUpdated
    const conversationUpdatedPayload = {
      conversationId: message.conversationId.toString(),
      lastMessage: lastValidMessage
        ? {
            _id: lastValidMessage._id,
            content: lastValidMessage.content || "",
            messageType: lastValidMessage.messageType || "text",
            userId: lastValidMessage.userId || null,
            createdAt: lastValidMessage.createdAt,
            linkURL: lastValidMessage.linkURL || [],
            deletedBy: lastValidMessage.deletedBy || [],
          }
        : null,
      updatedAt: conversation.updatedAt,
    };
    io.to(message.conversationId.toString()).emit("conversationUpdated", conversationUpdatedPayload);
    logger.info(`Đã phát sự kiện conversationUpdated`, conversationUpdatedPayload);

    // 12. Cập nhật danh sách media, files, links nếu cần
    if (message.messageType === "image" || message.messageType === "video") {
      const media = await Message.find({
        conversationId: message.conversationId,
        messageType: { $in: ["image", "video"] },
        linkURL: { $exists: true, $ne: [] },
        isRevoked: false,
        deletedBy: { $ne: userId },
      }).lean();
      io.to(message.conversationId.toString()).emit("chatMedia", media.length ? media : []);
      logger.info(`Đã cập nhật chatMedia cho cuộc trò chuyện ${message.conversationId}`);
    } else if (message.messageType === "file") {
      const files = await Message.find({
        conversationId: message.conversationId,
        messageType: "file",
        linkURL: { $exists: true, $ne: [] },
        isRevoked: false,
        deletedBy: { $ne: userId },
      }).lean();
      io.to(message.conversationId.toString()).emit("chatFiles", files.length ? files : []);
      logger.info(`Đã cập nhật chatFiles cho cuộc trò chuyện ${message.conversationId}`);
    } else if (message.messageType === "link") {
      const links = await Message.find({
        conversationId: message.conversationId,
        messageType: "link",
        linkURL: { $exists: true, $ne: [] },
        isRevoked: false,
        deletedBy: { $ne: userId },
      }).lean();
      io.to(message.conversationId.toString()).emit("chatLinks", links.length ? links : []);
      logger.info(`Đã cập nhật chatLinks cho cuộc trò chuyện ${message.conversationId}`);
    }

    // 13. Ghi log thành công
    logger.info(`Tin nhắn ${messageId} đã được xóa cho người dùng ${userId}`);

    // 14. Gửi phản hồi callback
    if (typeof callback === "function") {
      callback({
        success: true,
        data: {
          messageId,
          isMessageDeleted: true,
          deletedBy: userId,
        },
      });
    }
  } catch (error) {
    // 15. Xử lý lỗi
    logger.error(`Không thể xóa tin nhắn ${messageId} cho người dùng ${userId}: ${error.message}`);
    socket.emit("error", { message: "Không thể xóa tin nhắn", error: error.message });
    if (typeof callback === "function") {
      callback({ success: false, message: "Không thể xóa tin nhắn", error: error.message });
    }
  }
},

  // Xử lý thu hồi tin nhắn
  async handleRevokeMessage(socket, { messageId }, userId, io) {
    try {
      const message = await Message.findById(messageId);
      if (!message) return errorHandler(socket, "Message not found");

      if (message.userId.toString() !== userId.toString()) {
        return errorHandler(socket, "You cannot revoke this message");
      }

      message.isRevoked = true;
      await message.save();

      // Kiểm tra xem tin nhắn thu hồi có phải là tin nhắn cuối cùng không
      const conversation = await Conversation.findById(message.conversationId);
      if (!conversation) return errorHandler(socket, "Conversation not found");

      if (conversation.lastMessage?.toString() === messageId.toString()) {
        // Tìm tin nhắn gần nhất không bị thu hồi và không bị xóa
        const lastValidMessage = await Message.findOne({
          conversationId: message.conversationId,
          isRevoked: false,
          deletedBy: { $ne: userId }, // Loại bỏ tin nhắn đã bị xóa
        }).sort({ createdAt: -1 });

        conversation.lastMessage = lastValidMessage
          ? lastValidMessage._id
          : null;
        conversation.updatedAt = new Date();
        await conversation.save();
      }

      // Emit sự kiện thu hồi tin nhắn
      io.to(message.conversationId.toString()).emit("messageRevoked", {
        messageId: message._id,
      });

      // Emit cập nhật cuộc trò chuyện
      io.to(message.conversationId.toString()).emit("conversationUpdated", {
        conversationId: message.conversationId,
        lastMessage: conversation.lastMessage,
        updatedAt: conversation.updatedAt,
      });
    } catch (error) {
      errorHandler(socket, "Failed to revoke message", error);
    }
  },
};