const mongoose = require('mongoose');
const Message = require('../models/Message');
const { uploadFile } = require('../utils/file.service');
const socket = require('../services/socket');

module.exports = {
  getAllMessages: async (req, res) => {
    try {
      const messages = await Message.find();
      console.log("=====Test console Messages=====:", messages);
      res.status(200).json(messages);
    } catch (error) {
      console.log("=====Khong get duoc Messages=====");
      res.status(500).json({ message: "Error when get all messages" });
    }
  },
  getMessageByConversationId: async (req, res) => {
    try {
      const { conversationId } = req.params;
      console.log("=== conversationId nhận từ request === :", conversationId);

      const objectIdConversation = new mongoose.Types.ObjectId(conversationId);
      console.log("Kiểu dữ liệu của conversationId:", typeof conversationId);
      console.log("ObjectId đã convert:", objectIdConversation);

      const messages = await Message.find({ conversationId: objectIdConversation }).sort({ createdAt: 1 });

      console.log("Dữ liệu truy vấn từ MongoDB:", messages);

      if (!messages.length) {
        return res.status(404).json({ message: "Messages not found" });
      }

      res.status(200).json(messages);
    } catch (error) {
      console.log("=====Khong get duoc Messages by conversationId==== ", error);
      res.status(500).json({ message: "Error when get messages by conversationId" });
    }
  },
  deleteMessage: async (req, res) => {
    try {
      const { items } = req.body; // Nhận mảng các { messageId, urlIndex }
      
      if (!items || !Array.isArray(items) || items.length === 0) {
        console.warn('Yêu cầu xóa không hợp lệ:', { items });
        return res.status(400).json({ message: 'Vui lòng cung cấp danh sách các mục để xóa.' });
      }
  
      // Kiểm tra ObjectId hợp lệ và dữ liệu hợp lệ
      const invalidItems = items.filter(item => 
        !mongoose.Types.ObjectId.isValid(item.messageId) || 
        !Number.isInteger(item.urlIndex) || 
        item.urlIndex < 0
      );
      if (invalidItems.length > 0) {
        console.warn('Có mục không hợp lệ:', { invalidItems });
        return res.status(400).json({ message: 'Danh sách chứa các mục không hợp lệ.' });
      }
  
      // Xóa từng URL trong mảng linkURL
      const updatedMessages = [];
      for (const { messageId, urlIndex } of items) {
        const message = await Message.findById(messageId).select('linkURL');
        if (!message) {
          console.warn(`Không tìm thấy tin nhắn: ${messageId}`);
          continue;
        }
  
        // Kiểm tra urlIndex hợp lệ
        if (!message.linkURL || urlIndex >= message.linkURL.length) {
          console.warn(`urlIndex ${urlIndex} không hợp lệ cho tin nhắn: ${messageId}`);
          continue;
        }
  
        // Xóa URL tại urlIndex bằng updateOne
        const updateResult = await Message.updateOne(
          { _id: messageId },
          { $unset: { [`linkURL.${urlIndex}`]: 1 } }
        );
  
        if (updateResult.modifiedCount === 0) {
          console.warn(`Không thể xóa URL tại index ${urlIndex} của tin nhắn ${messageId}`);
          continue;
        }
  
        // Xóa các giá trị null/undefined trong linkURL
        await Message.updateOne(
          { _id: messageId },
          { $pull: { linkURL: null } }
        );
  
        // Kiểm tra nếu linkURL rỗng thì xóa tin nhắn
        const updatedMessage = await Message.findById(messageId).select('linkURL');
        if (!updatedMessage.linkURL || updatedMessage.linkURL.length === 0) {
          await Message.deleteOne({ _id: messageId });
          console.log(`Đã xóa tin nhắn ${messageId} vì linkURL rỗng`);
        } else {
          console.log(`Đã xóa URL tại index ${urlIndex} của tin nhắn ${messageId}`);
        }
  
        updatedMessages.push(messageId);
      }
  
      if (updatedMessages.length === 0) {
        return res.status(404).json({ message: 'Không có tin nhắn nào được cập nhật hoặc xóa.' });
      }
  
      res.status(200).json({ 
        message: `Đã xóa ${updatedMessages.length} mục thành công.`,
        updatedMessageIds: updatedMessages 
      });
    } catch (error) {
      console.error('Lỗi khi xóa mục:', error);
      res.status(500).json({ message: 'Lỗi server khi xóa mục.', error: error.message });
    }
  },
  revokeMessage: async (req, res) => {
    try {
      const { messageIds } = req.body; // Nhận một mảng messageIds từ body
  
      if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
        return res.status(400).json({ message: 'Vui lòng cung cấp một hoặc nhiều ID tin nhắn để xóa.' });
      }
  
      // Lấy thông tin các tin nhắn đã xóa để biết conversationId
      const messagesToDelete = await Message.find({ _id: { $in: messageIds } }).limit(1);
  
      if (messagesToDelete.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy tin nhắn nào để xóa.' });
      }
  
      const conversationId = messagesToDelete[0].conversationId;
  
      // Xóa các tin nhắn
      const deletedMessages = await Message.deleteMany({ _id: { $in: messageIds } });
  
      if (deletedMessages.deletedCount > 0) {
        // Phát sự kiện socket thông báo tin nhắn đã bị xóa (cho ChatPage)
        req.io.to(conversationId).emit('messageRevoked', { messageIds });
        console.log(`[BACKEND] Emitting messageRevoked to ${conversationId}:`, { messageIds });
  
        // Sau khi xóa, cập nhật thông tin cuộc trò chuyện (lastMessage)
        const updatedConversation = await Conversation.findByIdAndUpdate(
          conversationId,
          {
            $pull: { messages: { $in: messageIds } }, // Xóa các message ID khỏi mảng messages của conversation
            lastMessage: await Message.findOne({ conversationId }).sort({ createdAt: -1 }).populate('sender'), // Lấy tin nhắn cuối cùng còn lại và populate sender
            updatedAt: Date.now(),
          },
          { new: true }
        ).populate('participants'); // Populate participants nếu cần
  
        if (updatedConversation) {
          // Phát sự kiện socket thông báo cuộc trò chuyện đã được cập nhật (cho ChatList)
          req.io.to(conversationId).emit('conversationUpdated', updatedConversation);
          console.log(`[BACKEND] Emitting conversationUpdated to ${conversationId}:`, updatedConversation);
        }
      }
  
      res.status(200).json({ message: `Đã xóa ${deletedMessages.deletedCount} tin nhắn và các tài nguyên liên quan.` });
  
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  sendMessageWithMedia: async (req, res) => {
    try {
        console.log("Received file in backenddd :", req.file);

        if (req.file) {
            const file = req.file;
            const uploadResult = await uploadFile(file);
            const linkURL = uploadResult.Location;
            console.log("File uploaded to S3, link URLLLLL:", linkURL);
            res.status(200).json({ message: "File uploaded successfully", linkURL });
        } else {
            console.log("No file provided");
            res.status(400).json({ message: "No file provided" });
        }
    } catch (error) {
        console.error("Error sending message with media:", error);
        res.status(500).json({ message: "Error sending message with media" });
    }
},

};