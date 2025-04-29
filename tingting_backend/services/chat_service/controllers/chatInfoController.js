const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const bcrypt = require('bcrypt');
const axios = require('axios');
const mongoose = require('mongoose');
const socketService = require('../services/socket/socketService');
const { getUserSocketMap } = require('../services/socket/handlers/connection');

module.exports = {
    // Lấy thông tin nhóm/chat
    getChatInfo: async (req, res) => {
        try {
            const { conversationId } = req.params;
            console.log(`Lấy thông tin chat với ID: ${conversationId}`);
            const chat = await Conversation.findById(conversationId).populate('participants.userId');
            if (!chat) {
                console.log(`Chat ID ${conversationId} không tồn tại`);
                return res.status(404).json({ message: 'Chat không tồn tại' });
            }
            console.log(`Dữ liệu chat:`, chat);
            res.json(chat);
        } catch (error) {
            console.error(`Lỗi khi lấy thông tin chat:`, error);
            res.status(500).json({ error: error.message });
        }
    },

    // Lấy danh sách thành viên trong nhóm chat
    getParticipants: async (req, res) => {
        try {
            const { conversationId } = req.params;
            console.log(`Lấy danh sách thành viên trong nhóm chat ${conversationId}`);

            const chat = await Conversation.findById(conversationId).populate('participants.userId');
            if (!chat) {
                console.log(`Không tìm thấy nhóm với ID: ${conversationId}`);
                return res.status(404).json({ message: 'Nhóm không tồn tại' });
            }

            console.log(`Danh sách thành viên:`, chat.participants);
            res.json(chat.participants);
        } catch (error) {
            console.error(`Lỗi khi lấy danh sách thành viên:`, error);
            res.status(500).json({ error: error.message });
        }
    },

    // Lấy danh sách thành viên khả dụng để thêm vào nhóm
    getAvailableMembers: async (req, res) => {
        const { conversationId } = req.params;

        if (!conversationId) {
            return res.status(400).json({ message: "Thiếu conversationId trong params" });
        }

        try {
            const conversation = await Conversation.findById(conversationId).populate("participants.userId");
            if (!conversation) {
                return res.status(404).json({ message: "Không tìm thấy cuộc trò chuyện" });
            }

            const currentParticipantIDs = conversation.participants
                .map(p => p?.userId?._id.toString())
                .filter(Boolean);

            const allUsers = await mongoose.model('User').find({});
            const availableMembers = allUsers.filter(user => !currentParticipantIDs.includes(user._id.toString()));

            return res.json(availableMembers);
        } catch (error) {
            console.error("Lỗi khi lấy danh sách thành viên khả dụng:", error.message);
            return res.status(500).json({ error: "Lỗi server khi lấy danh sách thành viên khả dụng" });
        }
    },

    // Cập nhật tên nhóm
    updateChatName: async (req, res) => {
        try {
            const { conversationId } = req.params;
            const { name } = req.body;
            console.log(`Cập nhật tên chat với ID: ${conversationId}`);
            console.log(`Tên mới:`, name);

            const updatedChat = await Conversation.findByIdAndUpdate(conversationId, { name }, { new: true });
            if (!updatedChat) {
                console.log(`Chat ID ${conversationId} không tồn tại`);
                return res.status(404).json({ message: 'Chat không tồn tại' });
            }

            console.log(`Chat sau khi cập nhật:`, updatedChat);

            // Phát sự kiện qua Socket.IO
            const io = req.io;
            io.to(conversationId).emit('chatNameUpdated', {
                conversationId,
                name: updatedChat.name,
            });

            res.json(updatedChat);
        } catch (error) {
            console.error(`Lỗi khi cập nhật chat:`, error);
            res.status(500).json({ error: error.message });
        }
    },

    // Thêm thành viên vào nhóm
    addParticipant: async (req, res) => {
        try {
            const { conversationId } = req.params;
            const { userId, role } = req.body;
            console.log(`Thêm user ${userId} với vai trò ${role} vào chat ${conversationId}`);

            const chat = await Conversation.findByIdAndUpdate(
                conversationId,
                { $push: { participants: { userId, role } } },
                { new: true }
            ).populate('participants.userId');

            if (!chat) {
                console.log(`Chat ID ${conversationId} không tồn tại`);
                return res.status(404).json({ message: 'Chat không tồn tại' });
            }

            console.log(`Chat sau khi thêm thành viên:`, chat);

            // Phát sự kiện qua Socket.IO
            const io = req.io;
            io.to(conversationId).emit('participantAdded', {
                conversationId,
                userId,
                role,
                participants: chat.participants,
            });

            res.json(chat);
        } catch (error) {
            console.error(`Lỗi khi thêm thành viên:`, error);
            res.status(500).json({ error: error.message });
        }
    },

    // Xóa thành viên khỏi nhóm
    removeParticipant: async (req, res) => {
        try {
            const { conversationId } = req.params;
            const { userId } = req.body;

            console.log(`Xóa user ${userId} khỏi chat ${conversationId}`);
            console.log("Body nhận được:", req.body);

            if (!userId) {
                return res.status(400).json({ error: "Thiếu userId!" });
            }

            const chat = await Conversation.findByIdAndUpdate(
                conversationId,
                { $pull: { participants: { userId: userId } } },
                { new: true }
            ).populate('participants.userId');

            if (!chat) {
                console.error(`Không tìm thấy chat với ID: ${conversationId}`);
                return res.status(404).json({ error: "Chat không tồn tại." });
            }

            console.log(`Chat sau khi xóa thành viên:`, chat);

            // Phát sự kiện qua Socket.IO
            const io = req.io;
            io.to(conversationId).emit('participantRemoved', {
                conversationId,
                userId,
                participants: chat.participants,
            });

            res.json(chat);
        } catch (error) {
            console.error(`Lỗi khi xóa thành viên:`, error);
            res.status(500).json({ error: error.message });
        }
    },

    // Thay đổi vai trò của thành viên
    changeParticipantRole: async (req, res) => {
        try {
            const { conversationId } = req.params;
            const { userId, role } = req.body;
            console.log(`Thay đổi vai trò của user ${userId} thành ${role} trong chat ${conversationId}`);

            const chat = await Conversation.findOneAndUpdate(
                { _id: conversationId, 'participants.userId': userId },
                { $set: { 'participants.$.role': role } },
                { new: true }
            ).populate('participants.userId');

            if (!chat) {
                console.log(`Chat ID ${conversationId} không tồn tại hoặc user không thuộc chat`);
                return res.status(404).json({ message: 'Chat hoặc user không tồn tại' });
            }

            console.log(`Chat sau khi thay đổi vai trò:`, chat);

            // Phát sự kiện qua Socket.IO
            const io = req.io;
            io.to(conversationId).emit('participantRoleChanged', {
                conversationId,
                userId,
                role,
                participants: chat.participants,
            });

            res.json(chat);
        } catch (error) {
            console.log(`Lỗi khi thay đổi vai trò:`, error);
            res.status(500).json({ error: error.message });
        }
    },

    // Chuyển quyền trưởng nhóm
    transferGroupAdmin: async (req, res) => {
        try {
            const { conversationId } = req.params;
            const { newAdminUserId, requesterUserId } = req.body;

            console.log(`Yêu cầu chuyển quyền trưởng nhóm trong chat ${conversationId} cho user ${newAdminUserId} từ user ${requesterUserId}`);

            const conversation = await Conversation.findById(conversationId);
            if (!conversation) {
                return res.status(404).json({ message: 'Không tìm thấy cuộc trò chuyện.' });
            }

            const currentAdmin = conversation.participants.find(
                (p) => p.userId.toString() === requesterUserId && p.role === 'admin'
            );

            if (!currentAdmin) {
                return res.status(403).json({ message: 'Bạn không có quyền chuyển quyền trưởng nhóm.' });
            }

            const newAdmin = conversation.participants.find(
                (p) => p.userId.toString() === newAdminUserId
            );

            if (!newAdmin) {
                return res.status(404).json({ message: 'Không tìm thấy người dùng này trong cuộc trò chuyện.' });
            }

            let updatedConversation;

            try {
                const demoteResult = await Conversation.updateOne(
                    { _id: conversationId, 'participants.userId': requesterUserId },
                    { $set: { 'participants.$.role': 'member' } }
                );

                if (demoteResult.modifiedCount === 0) {
                    console.warn('Không thể hạ vai trò của trưởng nhóm hiện tại.');
                }

                const promoteResult = await Conversation.updateOne(
                    { _id: conversationId, 'participants.userId': newAdminUserId },
                    { $set: { 'participants.$.role': 'admin' } }
                );

                if (promoteResult.modifiedCount === 0) {
                    return res.status(400).json({ message: 'Không thể chuyển quyền trưởng nhóm.' });
                }

                updatedConversation = await Conversation.findById(conversationId).populate('participants.userId');
                if (!updatedConversation) {
                    console.error('Lỗi: Không thể tìm thấy cuộc trò chuyện sau khi cập nhật.');
                    return res.status(500).json({ error: 'Lỗi khi lấy thông tin cuộc trò chuyện đã cập nhật.' });
                }

                // Phát sự kiện qua Socket.IO
                const io = req.io;
                io.to(conversationId).emit('groupAdminTransferred', {
                    conversationId,
                    newAdminUserId,
                    requesterUserId,
                    participants: updatedConversation.participants,
                });

                res.json(updatedConversation);
            } catch (updateError) {
                console.error('Lỗi trong quá trình cập nhật vai trò:', updateError);
                return res.status(500).json({ error: 'Lỗi trong quá trình cập nhật vai trò.' });
            }
        } catch (error) {
            console.error('Lỗi khi chuyển quyền trưởng nhóm:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Lấy danh sách ảnh/video đã gửi trong nhóm
    getChatMedia: async (req, res) => {
        try {
            const { conversationId } = req.params;
            const media = await Message.find({
                conversationId: conversationId,
                messageType: { $in: ['image', 'video'] },
                linkURL: { $exists: true, $ne: [] },
            }).select('_id messageType content linkURL userId createdAt');

            console.log(`Lấy danh sách media trong chat ${conversationId}:`, media);
            res.json(media.length ? media : []);
        } catch (error) {
            console.error(`Lỗi khi lấy danh sách media:`, error);
            res.status(500).json({ error: error.message });
        }
    },

    // Lấy danh sách file đã gửi trong nhóm
    getChatFiles: async (req, res) => {
        try {
            const { conversationId } = req.params;
            const files = await Message.find({
                conversationId: conversationId,
                messageType: 'file',
            });

            console.log(`Lấy danh sách file trong chat ${conversationId}:`, files);
            res.json(files.length ? files : []);
        } catch (error) {
            console.error(`Lỗi khi lấy danh sách file:`, error);
            res.status(500).json({ error: error.message });
        }
    },

    // Lấy danh sách link đã gửi trong nhóm
    getChatLinks: async (req, res) => {
        try {
            const { conversationId } = req.params;
            const links = await Message.find({
                conversationId: conversationId,
                messageType: 'link',
            });

            console.log(`Lấy danh sách link trong chat ${conversationId}:`, links);
            res.json(links.length ? links : []);
        } catch (error) {
            console.error(`Lỗi khi lấy danh sách link:`, error);
            res.status(500).json({ error: error.message });
        }
    },

    // Lấy toàn bộ media, file và link đã gửi trong nhóm
    getChatStorage: async (req, res) => {
        try {
            const { conversationId } = req.params;

            const messages = await Message.find({
                conversationId: conversationId,
                messageType: { $in: ['image', 'video', 'file', 'link'] },
            });

            const media = [];
            const files = [];
            const links = [];

            messages.forEach(msg => {
                if (msg.messageType === 'image' || msg.messageType === 'video') {
                    media.push(msg);
                } else if (msg.messageType === 'file') {
                    files.push(msg);
                } else if (msg.messageType === 'link') {
                    links.push(msg);
                }
            });

            console.log(`Lấy dữ liệu lưu trữ trong nhóm ${conversationId}:`, {
                media: media.length,
                files: files.length,
                links: links.length,
            });

            res.json({
                media,
                files,
                links,
            });
        } catch (error) {
            console.error(`Lỗi khi lấy dữ liệu lưu trữ:`, error);
            res.status(500).json({ error: error.message });
        }
    },

    // Ghim cuộc trò chuyện
    pinChat: async (req, res) => {
        try {
            const { conversationId } = req.params;
            const { isPinned, userId } = req.body;

            console.log(`Ghim nhóm ${conversationId} với trạng thái ${isPinned} cho người dùng ${userId}`);
            if (!req.body || typeof isPinned !== 'boolean') {
                return res.status(400).json({ message: 'Invalid request body. isPinned must be a boolean.' });
            }

            const chat = await Conversation.findOneAndUpdate(
                { _id: conversationId, 'participants.userId': userId },
                { $set: { 'participants.$.isPinned': isPinned } },
                { new: true }
            ).populate('participants.userId');

            if (!chat) {
                return res.status(404).json({ message: 'Conversation not found' });
            }

            console.log(`Chat sau khi cập nhật trạng thái ghim:`, chat);

            // Phát sự kiện qua Socket.IO (chỉ gửi cho userId này)
            const io = req.io;
            const userSocketId = getUserSocketMap()[userId];
            if (userSocketId) {
                io.to(userSocketId).emit('chatPinned', {
                    conversationId,
                    isPinned,
                });
            }

            res.json(chat);
        } catch (error) {
            console.log(`Lỗi khi cập nhật trạng thái ghim nhóm:`, error);
            res.status(500).json({ error: error.message, stack: error.stack });
        }
    },

    // Lấy danh sách nhắc hẹn trong nhóm
    getReminders: async (req, res) => {
        try {
            const { conversationId } = req.params;
            console.log(`Lấy danh sách nhắc hẹn trong chat ${conversationId}`);
            const reminders = await Message.find({ conversationId: conversationId, messageType: 'reminder' });
            console.log(`Danh sách nhắc hẹn:`, reminders);
            res.json(reminders);
        } catch (error) {
            console.log(`Lỗi khi lấy danh sách nhắc hẹn:`, error);
            res.status(500).json({ error: error.message });
        }
    },

    // Tắt/bật thông báo nhóm
    updateNotification: async (req, res) => {
        try {
            const { conversationId } = req.params;
            const { userId, mute } = req.body;

            console.log(`Cập nhật trạng thái thông báo của người dùng ${userId} trong nhóm ${conversationId} thành ${mute}`);

            const chat = await Conversation.findOneAndUpdate(
                { _id: conversationId, 'participants.userId': userId },
                { $set: { 'participants.$.mute': mute } },
                { new: true }
            ).populate('participants.userId');

            if (!chat) {
                return res.status(404).json({ message: "Cuộc trò chuyện không tìm thấy!" });
            }

            console.log(`Chat sau khi cập nhật trạng thái thông báo:`, chat);

            // Phát sự kiện qua Socket.IO (chỉ gửi cho userId này)
            const io = req.io;
            const userSocketId = getUserSocketMap()[userId];
            if (userSocketId) {
                io.to(userSocketId).emit('notificationUpdated', {
                    conversationId,
                    mute,
                });
            }

            res.json(chat);
        } catch (error) {
            console.log(`Lỗi khi cập nhật trạng thái thông báo nhóm:`, error);
            res.status(500).json({ error: error.message });
        }
    },

    // Ẩn trò chuyện
    hideChat: async (req, res) => {
        const { conversationId } = req.params;
        const { userId, isHidden, pin } = req.body;

        try {
            console.log(`[HIDE CHAT] Processing request for conversation ID: ${conversationId}, user ID: ${userId}, hide status: ${isHidden}`);

            if (!userId) {
                console.warn(`[HIDE CHAT] Missing 'userId' in request body for conversation ${conversationId}.`);
                return res.status(400).json({ error: "Missing userId" });
            }

            const chat = await Conversation.findById(conversationId);
            if (!chat) {
                console.warn(`[HIDE CHAT] Conversation not found: ${conversationId}.`);
                return res.status(404).json({ error: "Conversation not found" });
            }

            const participant = chat.participants.find(p => p.userId.toString() === userId.toString());
            if (!participant) {
                console.warn(`[HIDE CHAT] User ${userId} is not a participant in conversation ${conversationId}.`);
                return res.status(404).json({ error: "User not found in this conversation" });
            }

            participant.isHidden = isHidden;
            if (isHidden && pin) {
                const saltRounds = 10;
                participant.pin = await bcrypt.hash(pin, saltRounds);
                console.log(`[HIDE CHAT] User ${userId} hid conversation ${conversationId} and set a PIN.`);
            } else if (!isHidden) {
                participant.pin = null;
                console.log(`[HIDE CHAT] User ${userId} unhid conversation ${conversationId}.`);
            }

            chat.updatedAt = Date.now();
            await chat.save();

            console.log(`[HIDE CHAT] Successfully updated hide status for user ${userId} in conversation ${conversationId}.`);

            // Phát sự kiện qua Socket.IO (chỉ gửi cho userId này)
            const io = req.io;
            const userSocketId = getUserSocketMap()[userId];
            if (userSocketId) {
                io.to(userSocketId).emit('chatHidden', {
                    conversationId,
                    isHidden,
                });
            }

            res.json(chat);
        } catch (error) {
            console.error(`[HIDE CHAT] Error while hiding/unhiding conversation ${conversationId} for user ${userId}:`, error);
            res.status(500).json({ error: "Failed to hide/unhide conversation.", details: error.message });
        }
    },

    // Xóa tin nhắn được chọn (phía người dùng)
    deleteSelectedMessagesForMe: async (req, res) => {
        try {
            const { messageIds, userId } = req.body;

            console.log("Message IDs từ body:", messageIds);
            console.log("User ID từ body:", userId);
            if (!userId) {
                return res.status(400).json({ message: "Vui lòng cung cấp userId trong body." });
            }

            if (!Array.isArray(messageIds) || messageIds.length === 0) {
                return res.status(400).json({ message: "Vui lòng chọn ít nhất một tin nhắn để xóa." });
            }

            const messages = await Message.find({ _id: { $in: messageIds } });
            if (!messages || messages.length === 0) {
                return res.status(404).json({ message: "Không tìm thấy tin nhắn nào với ID đã cung cấp." });
            }

            const updatePromises = messages.map(async (message) => {
                if (!message.deletedBy.includes(userId)) {
                    message.deletedBy.push(userId);
                    return message.save();
                }
                return null;
            });

            await Promise.all(updatePromises);

            // Phát sự kiện qua Socket.IO (chỉ gửi cho userId này)
            const io = req.io;
            const userSocketId = getUserSocketMap()[userId];
            if (userSocketId) {
                io.to(userSocketId).emit('messagesDeletedForMe', {
                    messageIds,
                    userId,
                });
            }

            res.json({ message: `Đã ẩn ${updatePromises.filter(p => p !== null).length} tin nhắn khỏi lịch sử của bạn.` });
        } catch (error) {
            console.error("Lỗi khi xóa nhiều tin nhắn:", error);
            res.status(500).json({ error: error.message });
        }
    },

    // Xóa toàn bộ tin nhắn trong cuộc trò chuyện (phía người dùng)
    deleteAllMessagesInConversationForMe: async (req, res) => {
        try {
            const { conversationId, userId } = req.query;

            if (!userId || !conversationId) {
                return res.status(400).json({ message: "Thiếu userId hoặc conversationId." });
            }

            const messages = await Message.find({ conversationId });
            if (!messages || messages.length === 0) {
                return res.status(404).json({ message: "Không tìm thấy tin nhắn nào." });
            }

            const updatePromises = messages.map(async (message) => {
                if (!message.deletedBy.includes(userId)) {
                    message.deletedBy.push(userId);
                    return message.save();
                }
                return null;
            });

            await Promise.all(updatePromises);

            // Phát sự kiện qua Socket.IO (chỉ gửi cho userId này)
            const io = req.io;
            const userSocketId = getUserSocketMap()[userId];
            if (userSocketId) {
                io.to(userSocketId).emit('allMessagesDeletedForMe', {
                    conversationId,
                    userId,
                });
            }

            res.json({ message: `Đã ẩn toàn bộ tin nhắn trong cuộc trò chuyện ${conversationId}.` });
        } catch (error) {
            console.error("Lỗi khi xóa:", error);
            res.status(500).json({ error: error.message });
        }
    },

    // Xóa lịch sử trò chuyện (phía người dùng)
    deleteChatHistoryForMe: async (req, res) => {
        try {
            const { conversationId } = req.params;
            const { userId } = req.body;

            if (!userId) {
                return res.status(400).json({ error: "Thiếu userId!" });
            }

            const userIdStr = String(userId);

            const result = await Message.updateMany(
                { conversationId: conversationId },
                { $addToSet: { deletedBy: userIdStr } }
            );

            // Phát sự kiện qua Socket.IO (chỉ gửi cho userId này)
            const io = req.io;
            const userSocketId = getUserSocketMap()[userId];
            if (userSocketId) {
                io.to(userSocketId).emit('chatHistoryDeletedForMe', {
                    conversationId,
                    userId,
                });
            }

            res.json({ message: "Lịch sử trò chuyện đã bị xóa khỏi tài khoản của bạn." });
        } catch (error) {
            console.error("Lỗi khi xóa lịch sử trò chuyện:", {
                message: error.message,
                stack: error.stack,
            });
            res.status(500).json({ error: "Lỗi server nội bộ.", details: error.message });
        }
    },

    // Nhóm chung của các user trong conversationId
    getCommonGroups: async (req, res) => {
        try {
            const { conversationId } = req.params;
            console.log(`Lấy danh sách nhóm chung với conversationId: ${conversationId}`);

            const currentConversation = await Conversation.findById(conversationId).populate('participants.userId');
            if (!currentConversation) {
                console.log(`Cuộc hội thoại với ID ${conversationId} không tồn tại`);
                return res.status(404).json({ message: 'Cuộc hội thoại không tồn tại' });
            }

            const participantIds = currentConversation.participants.map(p => p.userId.toString());
            console.log(`Danh sách userId trong cuộc hội thoại:`, participantIds);

            const commonGroups = await Conversation.find({
                _id: { $ne: conversationId },
                isGroup: true,
                'participants.userId': { $all: participantIds },
            }).populate('participants.userId');

            console.log(`Danh sách nhóm chung:`, commonGroups);

            res.json({
                currentConversation,
                commonGroups,
            });
        } catch (error) {
            console.error(`Lỗi khi lấy danh sách nhóm chung:`, error);
            res.status(500).json({ error: error.message });
        }
    },

    // Tìm kiếm tin nhắn
    findMessages: async (req, res) => {
        try {
            const { conversationId } = req.params;
            const { searchTerm } = req.query;

            console.log(`Tìm kiếm tin nhắn trong nhóm ${conversationId} với từ khóa "${searchTerm}"`);
            if (!searchTerm) {
                return res.status(400).json({ message: "Thiếu từ khóa tìm kiếm." });
            }

            const messages = await Message.find({
                conversationId,
                content: { $regex: searchTerm, $options: 'i' },
            });

            console.log(`Kết quả tìm kiếm:`, messages);
            res.json(messages);
        } catch (error) {
            console.error(`Lỗi khi tìm kiếm tin nhắn:`, error);
            res.status(500).json({ error: error.message });
        }
    },
};