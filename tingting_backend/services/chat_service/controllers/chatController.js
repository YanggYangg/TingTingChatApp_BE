const Message = require('../models/Message');
const Conversation = require('../models/Conversation'); // Import model Conversation
const { getIO } = require('../services/socket/socketService'); // Import hàm lấy instance IO
const { mongoose } = require('mongoose'); // Import mongoose để kiểm tra ObjectId

module.exports = {
    sendMessage: async (req, res) => {
        try {
            const { conversationId, userId, content, messageType, linkURL, replyMessageId } = req.body;

            if (!conversationId || !userId || !messageType) {
                console.log("Invalid message data:", req.body);
                return res.status(400).json({ message: "Invalid message data" });
            }

            if (messageType === 'text' && !content?.trim() && !replyMessageId) {
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
                linkURL: linkURL || null,
                replyMessageId: replyMessageId || null
            });

            await newMessage.save();
            console.log("Message saved to database:", newMessage);

            // Cập nhật lastMessage của Conversation
            await Conversation.findByIdAndUpdate(conversationId, {
                lastMessage: newMessage._id,
                updatedAt: Date.now()
            });

            const io = getIO();
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
            const messages = await Message.find({ conversationId }).sort({ createdAt: 1 }).populate('userId', 'username avatar'); // Populate thông tin người gửi
            console.log("Messages retrieved:", messages);

            res.status(200).json(messages);
        } catch (error) {
            console.error("Error when getting messages:", error);
            res.status(500).json({ message: "Error when getting messages" });
        }
    },

    revokeMessage: async (req, res) => {
        try {
            const { messageIds } = req.body;

            if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
                return res.status(400).json({ message: 'Vui lòng cung cấp một hoặc nhiều ID tin nhắn để xóa.' });
            }

            // Lấy thông tin các tin nhắn đã xóa để biết conversationId
            const messagesToDelete = await Message.find({ _id: { $in: messageIds } }).limit(1);

            if (messagesToDelete.length === 0) {
                return res.status(404).json({ message: 'Không tìm thấy tin nhắn nào để xóa.' });
            }

            const conversationId = messagesToDelete[0].conversationId;

            // Xóa các tin nhắn
            const deletedMessages = await Message.deleteMany({ _id: { $in: messageIds } });

            if (deletedMessages.deletedCount > 0) {
                const io = getIO();
                // Phát sự kiện socket thông báo tin nhắn đã bị xóa (cho ChatPage)
                io.to(conversationId).emit('messageRevoked', { messageIds });
                console.log(`[BACKEND] Emitting messageRevoked to ${conversationId}:`, { messageIds });

                // Sau khi xóa, cập nhật thông tin cuộc trò chuyện (lastMessage)
                const lastMessageAfterDelete = await Message.findOne({ conversationId }).sort({ createdAt: -1 });

                await Conversation.findByIdAndUpdate(
                    conversationId,
                    {
                        $pull: { messages: { $in: messageIds } }, // Xóa các message ID khỏi mảng messages của conversation (nếu có)
                        lastMessage: lastMessageAfterDelete ? lastMessageAfterDelete._id : null,
                        updateAt: Date.now(),
                    },
                    { new: true }
                );

                // Lấy lại conversation đã cập nhật để phát đi
                const updatedConversation = await Conversation.findById(conversationId);

                if (updatedConversation) {
                    // Phát sự kiện socket thông báo cuộc trò chuyện đã được cập nhật (cho ChatList)
                    io.to(conversationId).emit('conversationUpdated', updatedConversation);
                    console.log(`[BACKEND] Emitting conversationUpdated to ${conversationId}:`, updatedConversation);
                }
            }

            res.status(200).json({ message: `Đã xóa ${deletedMessages.deletedCount} tin nhắn và các tài nguyên liên quan.` });

        } catch (error) {
            console.error("Error when deleting message:", error);
            res.status(500).json({ error: error.message });
        }
    },
    forwardMessage: async (req, res) => {
        try {
            const { messageId, targetConversationIds, userId, content } = req.body;
            console.log("Dữ liệu nhận được:", req.body);

            if (!messageId || !Array.isArray(targetConversationIds) || targetConversationIds.length === 0 || !userId) {
                return res.status(400).json({ message: "Missing required information for forwarding." });
            }

            const originalMessage = await Message.findById(messageId);
            if (!originalMessage) {
                return res.status(404).json({ message: "Original message not found." });
            }

            const forwardedMessages = [];

            for (const targetConversationId of targetConversationIds) {
                // Kiểm tra xem targetConversationId có phải là ObjectId hợp lệ không
                if (!mongoose.Types.ObjectId.isValid(targetConversationId)) {
                    console.log(`Invalid targetConversationId: ${targetConversationId}`);
                    continue; // Bỏ qua ID không hợp lệ và tiếp tục
                }

                const newMessage = new Message({
                    conversationId: targetConversationId,
                    userId: userId,
                    content: content ? `${content}\n\n--- Forwarded Message ---\n${originalMessage.content}` : `--- Forwarded Message ---\n${originalMessage.content}`,
                    messageType: originalMessage.messageType,
                    linkURL: originalMessage.linkURL,
                    replyMessageId: originalMessage.replyMessageId,
                });

                console.log("Tin nhắn trước khi lưu:", newMessage);
                try {
                    const savedMessage = await newMessage.save();
                    console.log("Tin nhắn sau khi lưu:", savedMessage);
                    forwardedMessages.push(savedMessage);

                    try {
                        const updateResult = await Conversation.findByIdAndUpdate(targetConversationId, {
                            lastMessage: savedMessage._id,
                            updateAt: Date.now()
                        });
                        console.log("Kết quả cập nhật Conversation:", updateResult);
                        if (!updateResult) {
                            console.log(`Không tìm thấy Conversation để cập nhật: ${targetConversationId}`);
                        }
                    } catch (updateError) {
                        console.error("Lỗi khi cập nhật Conversation:", updateError);
                    }

                    const io = getIO();
                    if (io) {
                        io.to(targetConversationId).emit("receiveMessage", savedMessage);
                        console.log(`Forwarded message emitted to conversation ${targetConversationId}:`, savedMessage);
                    } else {
                        console.log("Socket IO không được khởi tạo.");
                    }
                } catch (saveError) {
                    console.error("Lỗi khi lưu tin nhắn đã chuyển tiếp:", saveError);
                    // Quyết định xem có muốn tiếp tục chuyển tiếp đến các cuộc trò chuyện khác hay không
                }
            }

            res.status(201).json(forwardedMessages);

        } catch (error) {
            console.error("Lỗi chung khi chuyển tiếp tin nhắn:", error);
            res.status(500).json({ message: "Error when forwarding message." });
        }
    },

};