const mongoose = require('mongoose');
const Message = require('../models/Message');

module.exports = {
    getAllMessages: async (req, res) => {
        try {
            const messages = await Message.find();
            console.log("=====Test console Messages=====:", messages);
            res.status(200).json(messages);
        } catch (error) {
            console.log("=====Khong get duoc Messages=====");
            res.status(500).json({ message: "Error when get all messages" });
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
    }
};