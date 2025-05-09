// const amqp = require('amqplib');
// const mongoose = require('mongoose');
// const connectDB = require('../configs/db');
// const Notification = require('../models/Notification');

// const RABBITMQ_URL = 'amqp://localhost';
// const QUEUE_NAME = 'chat_notifications';

// async function consumeMessages() {
//   try{
//     await connectDB();
//     console.log("MongoDB connected in consumer.");

//     const connection = await amqp.connect(RABBITMQ_URL);
//     const channel = await connection.createChannel();
//     await channel.assertQueue(QUEUE_NAME, { durable: true });

//     console.log("Waiting for messages in queue:");

//     channel.consume(QUEUE_NAME, async (msg) => {
//       if(msg !== null) {
//         const messageData = JSON.parse(msg.content.toString());
//         console.log("Received message:", messageData);


//         //Save DB
//         const notification = new Notification({
//           userId: messageData.userId,
//           conversationId: messageData.conversationId,
//           messageId: messageData.messageId,
//           typeNotice: 'new_message',
//           content: messageData.content,
//         });
//         await notification.save();
//         console.log("Notification saved to database !");
//         channel.ack(msg);
//       }
//     }, {
//       noAck: false,//bug trong qtrinh luu DB de rabbitmq retry ko gọi ack
//     });
//   }catch (error) {
//     console.error("Error consuming messages from queue:", error);
//   }
// }
// consumeMessages();

const amqp = require('amqplib');
const mongoose = require('mongoose');
const connectDB = require('../configs/db');
const Notification = require('../models/Notification');
const UserFcmToken = require('../models/UserFcmToken');
const admin = require('../configs/firebase');

const RABBITMQ_URL = 'amqp://localhost';
const QUEUE_NAME = 'chat_notifications';

async function consumeMessages() {
  try {
    await connectDB();
    console.log("MongoDB connected in consumer.");

    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });

    console.log("Waiting for messages in queue:");

    channel.consume(QUEUE_NAME, async (msg) => {
      if (msg !== null) {
        const messageData = JSON.parse(msg.content.toString());
        console.log("Received message:", messageData);

        const {
          userId,
          conversationId,
          messageId,
          content,
          typeNotice,
          data
        } = messageData;

        // Save to DB
        const notification = new Notification({
          userId,
          conversationId,
          messageId,
          typeNotice: typeNotice || 'new_message',
          content,
        });

        await notification.save();
        console.log("Notification saved to database!");

        // Gửi FCM
        const tokenRecord = await UserFcmToken.findOne({ userId });
        if (tokenRecord && tokenRecord.fcmToken) {
          const fcmMessage = {
            token: tokenRecord.fcmToken,
            notification: {
              title: "TingTingChatApp",
              body: content || "Bạn có tin nhắn mới!",
            },
            data: {
              notificationId: notification._id.toString(),
              typeNotice: typeNotice || "new_message",
              ...(data || {}),
            },
          };

          try {
            const fcmRes = await admin.messaging().send(fcmMessage);
            console.log("FCM sent successfully:", fcmRes);
          } catch (err) {
            console.error("Error sending FCM:", err);
          }
        } else {
          console.warn(`[!] No FCM token found for user: ${userId}`);
        }

        channel.ack(msg);
      }
    }, {
      noAck: false,
    });
  } catch (error) {
    console.error("Error consuming messages from queue:", error);
  }
}
consumeMessages();
