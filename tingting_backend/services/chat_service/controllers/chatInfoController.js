const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

module.exports = {
    // Lấy thông tin nhóm/chat
    getChatInfo: async (req, res) => {
        console.log(`🔎 Lấy thông tin chat`);
        try {
            const { chatId } = req.params;
            console.log(` Lấy thông tin chat với ID: ${chatId}`);
            const chat = await Conversation.findById(chatId).populate('participants.userId', 'name avatar');
            if (!chat) {
                console.log(` Chat ID ${chatId} không tồn tại`);
                return res.status(404).json({ message: 'Chat không tồn tại' });
            }
            console.log(` Dữ liệu chat:`, chat);
            res.json(chat);
        } catch (error) {
            console.error(` Lỗi khi lấy thông tin chat:`, error);
            res.status(500).json({ error: error.message });
        }
    },
    // Lấy danh sách thành viên trong nhóm chat (Không cần thiết)
    getParticipants: async (req, res) => {
        try {
            const { chatId } = req.params;
            console.log(`Lấy danh sách thành viên trong nhóm chat ${chatId}`);

            const chat = await Conversation.findById(chatId).populate('participants.userId', 'name avatar email');

            if (!chat) {
                console.log(`Không tìm thấy nhóm với ID: ${chatId}`);
                return res.status(404).json({ message: 'Nhóm không tồn tại' });
            }

            console.log(`Danh sách thành viên:`, chat.participants);
            res.json(chat.participants);
        } catch (error) {
            console.error(`Lỗi khi lấy danh sách thành viên:`, error);
            res.status(500).json({ error: error.message });
        }
    },


    // Cập nhật tên nhóm
    updateChatName: async (req, res) => {
        try {
            const { chatId } = req.params;
            const { name } = req.body;
            console.log(`Cập nhật tên chat với ID: ${chatId}`);
            console.log(`Tên mới:`, name);

            const updatedChat = await Conversation.findByIdAndUpdate(chatId, { name }, { new: true });
            console.log(` Chat sau khi cập nhật:`, updatedChat);
            res.json(updatedChat);
        } catch (error) {
            console.error(` Lỗi khi cập nhật chat:`, error);
            res.status(500).json({ error: error.message });
        }
    },

    // Thêm thành viên vào nhóm
    addParticipant: async (req, res) => {
        try {
            const { chatId } = req.params;
            const { userId, role } = req.body;
            console.log(` Thêm user ${userId} với vai trò ${role} vào chat ${chatId}`);
            const chat = await Conversation.findByIdAndUpdate(chatId, { $push: { participants: { userId, role } } }, { new: true });
            console.log(` Chat sau khi thêm thành viên:`, chat);
            res.json(chat);
        } catch (error) {
            console.error(` Lỗi khi thêm thành viên:`, error);
            res.status(500).json({ error: error.message });
        }
    },

    removeParticipant: async (req, res) => {
        try {
            const { chatId } = req.params;
            const { userId } = req.body;

            console.log(`Xóa user ${userId} khỏi chat ${chatId}`);
            console.log("Body nhận được:", req.body); // Kiểm tra dữ liệu gửi lên

            // Kiểm tra nếu không có userId
            if (!userId) {
                return res.status(400).json({ error: "Thiếu userId!" });
            }

            // Xóa userId khỏi danh sách participants
            const chat = await Conversation.findByIdAndUpdate(
                chatId,
                { $pull: { participants: { userId } } },
                { new: true }
            );

            if (!chat) {
                console.error(`Không tìm thấy chat với ID: ${chatId}`);
                return res.status(404).json({ error: "Chat không tồn tại." });
            }

            console.log(`Chat sau khi xóa thành viên:`, chat);
            res.json(chat);
        } catch (error) {
            console.error(`Lỗi khi xóa thành viên:`, error);
            res.status(500).json({ error: error.message });
        }
    },

    // Thay đổi vai trò của thành viên
    changeParticipantRole: async (req, res) => {
        try {
            const { chatId } = req.params;
            const { userId, role } = req.body;
            console.log(`Thay đổi vai trò của user ${userId} thành ${role} trong chat ${chatId}`);

            const chat = await Conversation.findOneAndUpdate({ _id: chatId, 'participants.userId': userId }, { $set: { 'participants.$.role': role } }, { new: true });
            console.log(` Chat sau khi thay đổi vai trò:`, chat);

            res.json(chat);
        } catch (error) {
            console.log(` Lỗi khi thay đổi vai trò:`, error);

            res.status(500).json({ error: error.message });
        }
    },

    // Lấy danh sách ảnh/video đã gửi trong nhóm
    getChatMedia: async (req, res) => {
        try {
            const { chatId } = req.params;
            const media = await Message.find({
                conversationId: chatId,
                messageType: { $in: ['image', 'video'] }
            });

            console.log(`Lấy danh sách media trong chat ${chatId}:`, media);
            res.json(media.length ? media : []); // Trả về mảng rỗng nếu không có dữ liệu
        } catch (error) {
            console.error(`Lỗi khi lấy danh sách media:`, error);
            res.status(500).json({ error: error.message });
        }
    },

    // Lấy danh sách file đã gửi trong nhóm
    getChatFiles: async (req, res) => {
        try {
            const { chatId } = req.params;
            const files = await Message.find({
                conversationId: chatId,
                messageType: 'file'
            });

            console.log(`Lấy danh sách file trong chat ${chatId}:`, files);
            res.json(files.length ? files : []);
        } catch (error) {
            console.error(`Lỗi khi lấy danh sách file:`, error);
            res.status(500).json({ error: error.message });
        }
    },

    // Lấy danh sách link đã gửi trong nhóm
    getChatLinks: async (req, res) => {
        try {
            const { chatId } = req.params;
            const links = await Message.find({
                conversationId: chatId,
                messageType: 'link'
            });

            console.log(`Lấy danh sách link trong chat ${chatId}:`, links);
            res.json(links.length ? links : []);
        } catch (error) {
            console.error(`Lỗi khi lấy danh sách link:`, error);
            res.status(500).json({ error: error.message });
        }
    },

    // Lấy danh sách tin nhắn đã ghim
    getPinnedMessages: async (req, res) => {
        try {
            const { chatId } = req.params;
            const pinnedMessages = await Message.find({ conversationId: chatId, 'message.isPinned': true });
            console.log(` Lấy danh sách tin nhắn đã ghim trong chat ${chatId}`);
            console.log(` Danh sách tin nhắn đã ghim:`, pinnedMessages);

            res.json(pinnedMessages);
        } catch (error) {
            console.log(` Lỗi khi lấy danh sách tin nhắn đã ghim:`, error);
            res.status(500).json({ error: error.message });
        }
    },

    // Ghim một tin nhắn quan trọng
    pinMessage: async (req, res) => {
        try {
            const { messageId } = req.params;
            const message = await Message.findByIdAndUpdate(messageId, { 'message.isPinned': true }, { new: true });
            console.log(` Ghim tin nhắn ${messageId}`);
            console.log(` Tin nhắn đã ghim:`, message);

            res.json(message);
        } catch (error) {
            console.log(` Lỗi khi ghim tin nhắn:`, error);
            res.status(500).json({ error: error.message });
        }
    },

    // Bỏ ghim tin nhắn
    unpinMessage: async (req, res) => {
        try {
            const { messageId } = req.params;
            const message = await Message.findByIdAndUpdate(messageId, { 'message.isPinned': false }, { new: true });
            console.log(`📍 Bỏ ghim tin nhắn ${messageId}`);
            console.log(` Tin nhắn sau khi bỏ ghim:`, message);

            res.json(message);
        } catch (error) {
            console.log(` Lỗi khi bỏ ghim tin nhắn:`, error);
            res.status(500).json({ error: error.message });
        }
    },

    // Lấy danh sách nhắc hẹn trong nhóm
    getReminders: async (req, res) => {
        try {
            const { chatId } = req.params;
            console.log(` Lấy danh sách nhắc hẹn trong chat ${chatId}`);
            const reminders = await Message.find({ conversationId: chatId, 'message.messageType': 'reminder' });
            console.log(` Danh sách nhắc hẹn:`, reminders);
            res.json(reminders);
        } catch (error) {
            console.log(` Lỗi khi lấy danh sách nhắc hẹn:`, error);
            res.status(500).json({ error: error.message });
        }
    }
};