const Conversation = require('../models/Conversation');

module.exports = {
    getAllConversations: async (req, res) => {
        try{
            const conversations = await Conversation.find();
            console.log("=====Test console Conversations=====:",conversations);
            res.status(200).json(conversations);
        }catch(error){
            cónsole.log("=====Khong get duoc Conversations=====");
            res.status(500).json({message: "Error when get all conversations"});
        }
    }
};