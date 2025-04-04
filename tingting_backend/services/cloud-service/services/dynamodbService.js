const { dynamodb } = require("../config/awsConfig");
const {
  PutCommand,
  GetCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");

class DynamoDBService {
  async saveMessage(messageData) {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Item: messageData,
    };
    return dynamodb.send(new PutCommand(params));
  }

  async getMessage(messageId) {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: { messageId },
    };
    const result = await dynamodb.send(new GetCommand(params));
    return result;
  }

  async getMessagesByUserId(userId) {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      IndexName: "userId-index", // Tên GSI
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": userId,
      },
    };
    const result = await dynamodb.send(new QueryCommand(params));
    return result.Items || [];
  }
}

module.exports = new DynamoDBService();
