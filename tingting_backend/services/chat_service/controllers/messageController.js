const mongoose = require('mongoose');
const Message = require('../models/Message');
const sendMessageToQueue = require('../rabbitmq/producer');

module.exports = {
    getAllMessages: async (req, res) => {
        try{
            const messages = await Message.find();
            console.log("=====Test console Messages=====:",messages);
            res.status(200).json(messages);
        }catch(error){
            cónsole.log("=====Khong get duoc Messages=====");
            res.status(500).json({message: "Error when get all messages"});
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
    sendMessage: async (req, res) => {
        try{
            const { userId, conversationId, messageId, content } = req.body;
        if (!userId || !conversationId || !content) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        //Save in DB
        const newMessage = new Message({
            userId,
            conversationId,
            content,
            createdAt: new Date(),
        });
        await newMessage.save();

        //Send to RabbitMQ
        const notificationData = {
            userId,
            conversationId,
            messageId: newMessage._id, // ID của tin nhắn vừa lưu
            typeNotice: "new_message",
            content,
            isRead: false,
            createdAt: new Date(),
        };
        await sendMessageToQueue(notificationData);//Send to queue
        
        res.status(200).json({
            message: "Message sent and notification queued!",
            data: newMessage,
          });
    }catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }

};