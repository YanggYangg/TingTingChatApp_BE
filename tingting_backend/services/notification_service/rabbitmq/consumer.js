const amqp = require("amqplib");
const Notification = require("../models/Notification");

async function receiveMessages() {
  const connection = await amqp.connect("amqp://localhost");
  const channel = await connection.createChannel();
  const queue = "notification_queue";

  await channel.assertQueue(queue, { durable: true });
  console.log("Waiting for notifications...");

  channel.consume(queue, async (msg) => {
    if (msg !== null) {
      const notificationData = JSON.parse(msg.content.toString());
      console.log("Received notification:", notificationData);

      await Notification.create(notificationData);
      channel.ack(msg);
    }
  });
}

receiveMessages();
