const sendMessageToQueue = require("./rabbitmq/producer");

const testMessage = {
  userId: "123",
  conversationId: "456",
  messageId: "789",
  typeNotice: "new_message",
  content: "hello quỳnh giang",
  isRead: false,
  createdAt: new Date(),
};

sendMessageToQueue(testMessage)
  .then(() => console.log("Message sent successfully!"))
  .catch((err) => console.error("Error sending message:", err));
