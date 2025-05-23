const DynamoDBService = require('../services/dynamodbService');

class Message {
  constructor(userId, content, timestamp, fileUrls = null, thumbnailUrls = null, filenames = null) {
    this.messageId = require('uuid').v4();
    this.userId = userId;
    this.content = content;
    this.timestamp = timestamp;
    this.fileUrls = fileUrls;
    this.thumbnailUrls = thumbnailUrls;
    this.filenames = filenames;
  }

  async save() {
    return DynamoDBService.saveMessage(this);
  }

  static async findById(messageId) {
    return DynamoDBService.getMessage(messageId);
  }

  static async findByUserId(userId) {
    return DynamoDBService.getMessagesByUserId(userId);
  }

  static async deleteById(messageId) {
    return DynamoDBService.deleteMessage(messageId);
  }
}

module.exports = Message;