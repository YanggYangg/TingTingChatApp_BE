const S3Service = require("../services/s3Service");
const Message = require("../models/messageModel");

class FileController {
  async uploadFile(req, res) {
    try {
      const { userId, content } = req.body;
      const files = req.files;
  
      if (!userId) {
        return res.status(400).json({ message: "Vui lòng cung cấp userId" });
      }
  
      let fileUrls = null;
      let thumbnailUrls = null;
      let filenames = null;
      if (files && files.length > 0) {
        const uploadResults = await S3Service.uploadMultipleFiles(files);
        fileUrls = uploadResults.map((result) => result.fileUrl);
        thumbnailUrls = uploadResults
          .map((result) => result.thumbnailUrl)
          .filter((url) => url);
        filenames = uploadResults.map((result) => result.filename);
      }
  
      const timestamp = new Date().toISOString();
      const message = new Message(
        userId,
        content || null,
        timestamp,
        fileUrls,
        thumbnailUrls,
        filenames
      );
      await message.save();
  
      const io = req.app.get('socketio');
      if (!io) {
        console.error('Socket.IO not initialized in fileController');
        return res.status(500).json({ error: 'Socket.IO not initialized' });
      }
  
      const messageData = {
        messageId: message.messageId,
        userId,
        content: message.content,
        timestamp,
        fileUrls,
        thumbnailUrls,
        filenames,
      };
      console.log('Emitting newMessage:', messageData);
      io.emit('newMessage', messageData);
  
      res.status(201).json({
        message: 'Tin nhắn và file (nếu có) đã được lưu và gửi real-time',
        data: messageData,
        status: 'SUCCESS',
      });
    } catch (error) {
      console.error('Error in uploadFile:', error.message);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new FileController();
