const Conversation = require('../models/Conversation');

module.exports = {
    getAllConversations: async (req, res) => {
        try {
            const conversations = await Conversation.find();
            console.log("=====Test console Conversations=====:", conversations);
            res.status(200).json(conversations);
        } catch (error) {
            console.log("=====Khong get duoc Conversations=====");
            res.status(500).json({ message: "Error when get all conversations" });
        }
    }
    ,
    createConversation: async (req, res) => {
        try {
            const newConversation = new Conversation(req.body);
            await newConversation.save();
            res.status(201).json(newConversation);
        } catch (error) {
            console.log("=====Khong tao duoc Conversations=====");
            res.status(500).json({ message: "Error when create conversation" });
        }
    },
};
