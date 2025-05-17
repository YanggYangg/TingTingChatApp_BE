const Message = require("../../../models/Message");
const Conversation = require("../../../models/Conversation");
const logger = require("../../../utils/logger");
const errorHandler = require("../../../utils/errorHandler");

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
    ["image", "file", "video"].includes(message.messageType) &&
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
  async handleDeleteMessage(socket, { messageId }, userId, io) {
    try {
      const message = await Message.findById(messageId);
      if (!message) return errorHandler(socket, "Message not found");

      const result = await Message.updateOne(
        { _id: messageId },
        { $addToSet: { deletedBy: userId } }
      );

      if (result.modifiedCount === 0) {
        return errorHandler(socket, "Failed to delete message");
      } else {
        logger.info(`Message deleted by user ${userId}: ${messageId}`);
      }

      const conversation = await Conversation.findById(message.conversationId);
      if (!conversation) return errorHandler(socket, "Conversation not found");

      if (conversation.lastMessage?.toString() === messageId.toString()) {
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

        io.to(message.conversationId.toString()).emit("conversationUpdated", {
          conversationId: message.conversationId,
          lastMessage: lastValidMessage || null,
          updatedAt: conversation.updatedAt,
        });
      }

      socket.to(message.conversationId).emit("messageDeleted", { messageId });
      logger.info(`Message deleted: ${messageId}`);
    } catch (error) {
      errorHandler(socket, "Failed to delete message", error);
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