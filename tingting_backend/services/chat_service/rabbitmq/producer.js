const amqp = require("amqplib");

async function sendMessageToQueue(notificationData) {
  try {
    const connection = await amqp.connect("amqp://localhost");
    const channel = await connection.createChannel();
    const queue = "notification_queue";

    await channel.assertQueue(queue, { durable: true });

    channel.sendToQueue(queue, Buffer.from(JSON.stringify(notificationData)), {
      persistent: true,
    });

    console.log("📩 Đã gửi message vào queue:", notificationData);

    setTimeout(() => {
      connection.close();
    }, 500);
  } catch (error) {
    console.error("❌ Lỗi khi gửi message vào queue:", error);
  }
}

module.exports = sendMessageToQueue;
