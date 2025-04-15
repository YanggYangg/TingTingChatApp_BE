const Message = require('../models/Message');
const { io } = require('../services/socket/socketService'); // Import Socket.IO từ file cấu hình

module.exports = {
    sendMessage: async (req, res) => {
        try {
            const { conversationId, userId, content, messageType, linkURL } = req.body;

            //   console.log("Received sendMessage request:", req.body);

            if (!conversationId || !userId || !messageType) {
                console.log("Invalid message data:", req.body);
                return res.status(400).json({ message: "Invalid message data" });
            }

            if (messageType === 'text' && !content?.trim()) {
                console.log("Text message cannot be empty.");
                return res.status(400).json({ message: "Text message cannot be empty" });
            }

            if (['image', 'file', 'video'].includes(messageType) && !linkURL) {
                console.log("File message must have a linkURL.");
                return res.status(400).json({ message: "File message must have a linkURL" });
            }

            const newMessage = new Message({
                conversationId,
                userId,
                content: content?.trim() || '',
                messageType,
                linkURL: linkURL || null
            });

            //  await newMessage.save();
            //  console.log("Message saved to database:", newMessage);

            // Phát sự kiện tới tất cả user trong phòng trò chuyện
            io.to(conversationId).emit("receiveMessage", newMessage);
            console.log(`Message sent to conversation ${conversationId}:`, newMessage);

            res.status(201).json(newMessage);
        } catch (error) {
            console.error("Error when sending message:", error);
            res.status(500).json({ message: "Error when sending message" });
        }
    },

    getMessages: async (req, res) => {
        try {
            const { conversationId } = req.params;

            if (!conversationId) {
                console.log("Conversation ID is required");
                return res.status(400).json({ message: "Conversation ID is required" });
            }

            console.log(`Fetching messages for conversationId: ${conversationId}`);
            const messages = await Message.find({ conversationId }).sort({ createdAt: 1 });
            console.log("Messages retrieved:", messages);

            res.status(200).json(messages);
        } catch (error) {
            console.error("Error when getting messages:", error);
            res.status(500).json({ message: "Error when getting messages" });
        }
    }
};
