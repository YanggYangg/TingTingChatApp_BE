// const Message = require('../models/messageModel');
// const S3Service = require('../services/s3Service');

// class MessageController {
//   async sendMessage(req, res) {
//     try {
//       const { userId, content } = req.body;
//       const timestamp = new Date().toISOString();
//       const message = new Message(userId, content, timestamp);
//       await message.save();
//       res.status(201).json({ message: 'Tin nhắn đã được lưu', data: message });
//     } catch (error) {
//       res.status(500).json({ error: error.message });
//     }
//   }

//   async getMessage(req, res) {
//     try {
//       const { messageId } = req.params;
//       const result = await Message.findById(messageId);
//       if (!result.Item) {
//         return res.status(404).json({ message: 'Không tìm thấy tin nhắn' });
//       }
//       res.status(200).json(result.Item);
//     } catch (error) {
//       res.status(500).json({ error: error.message });
//     }
//   }

//   async getMessagesByUser(req, res) {
//     try {
//       const { userId } = req.params;
//       const messages = await Message.findByUserId(userId);
//       if (messages.length === 0) {
//         return res.status(404).json({ message: 'Không tìm thấy tin nhắn nào cho user này' });
//       }
//       res.status(200).json(messages);
//     } catch (error) {
//       res.status(500).json({ error: error.message });
//     }
//   }

//   async deleteMessage(req, res) {
//     try {
//       const { messageId } = req.params;
//       const deletedMessage = await Message.deleteById(messageId); // Sửa ở đây: dùng Message.deleteById

//       if (!deletedMessage) {
//         return res.status(404).json({ message: 'Không tìm thấy tin nhắn để xóa' });
//       }

//       // Xóa file và thumbnail trên S3 (nếu có)
//       await S3Service.deleteFiles(deletedMessage.fileUrls, deletedMessage.thumbnailUrls);

//       res.status(200).json({ message: 'Tin nhắn và file liên quan đã được xóa' });
//     } catch (error) {
//       res.status(500).json({ error: error.message });
//     }
//   }
// }

// module.exports = new MessageController();

const Message = require('../models/messageModel');
const S3Service = require('../services/s3Service');

class MessageController {
  async sendMessage(req, res) {
    try {
      const { userId, content } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "Vui lòng cung cấp userId" });
      }
      const timestamp = new Date().toISOString();
      const message = new Message(userId, content, timestamp);
      await message.save();
  
      const io = req.app.get('socketio');
      if (!io) {
        console.error('Socket.IO not initialized in messageController');
        return res.status(500).json({ error: 'Socket.IO not initialized' });
      }
  
      const messageData = {
        messageId: message.messageId,
        userId,
        content: message.content,
        timestamp,
        fileUrls: null,
        thumbnailUrls: null,
        filenames: null,
      };
      console.log('Emitting newMessage:', messageData);
      io.emit('newMessage', messageData);
  
      res.status(201).json({ message: 'Tin nhắn đã được lưu và gửi real-time', data: message, status: 'SUCCESS' });
    } catch (error) {
      console.error('Error in sendMessage:', error.message);
      res.status(500).json({ error: error.message });
    }
  }

  async getMessage(req, res) {
    try {
      const { messageId } = req.params;
      const result = await Message.findById(messageId);
      if (!result.Item) {
        return res.status(404).json({ message: 'Không tìm thấy tin nhắn' });
      }
      res.status(200).json(result.Item);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getMessagesByUser(req, res) {
    try {
      const { userId } = req.params;
      const messages = await Message.findByUserId(userId);
      if (messages.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy tin nhắn nào cho user này' });
      }
      res.status(200).json(messages);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async deleteMessage(req, res) {
    try {
      const { messageId } = req.params;
      const deletedMessage = await Message.deleteById(messageId);

      if (!deletedMessage) {
        return res.status(404).json({ message: 'Không tìm thấy tin nhắn để xóa' });
      }

      // Xóa file và thumbnail trên S3 (nếu có)
      await S3Service.deleteFiles(deletedMessage.fileUrls, deletedMessage.thumbnailUrls);

      // Lấy socket.io từ app
      const io = req.app.get('socketio');
      // Phát sự kiện messageDeleted tới tất cả client
      io.emit('messageDeleted', { messageId });

      res.status(200).json({ message: 'Tin nhắn và file liên quan đã được xóa' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new MessageController();