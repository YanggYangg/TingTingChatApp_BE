const amqp = require('amqplib');

const RABBITMQ_URL = 'amqp://localhost';
const QUEUE_NAME = 'chat_notifications';

async function sendMessageToQueue(message){
  try{
    const connection = await amqp.connect(RABBITMQ_URL);
    console.log("Connected to RabbitMQ", connection);
    
    const channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });

    channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(message)), { persistent: true });
    console.log("Message sent to queue:", message);

    setTimeout(() => {
      connection.close();
    }
    , 500);
  }catch (error) {
    console.error("Error sending message to queue:", error);
  }
}

module.exports = sendMessageToQueue;