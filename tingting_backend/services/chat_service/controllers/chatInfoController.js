const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const bcrypt = require('bcrypt');
const axios = require('axios');

module.exports = {
    // Lấy thông tin nhóm/chat
    getChatInfo: async (req, res) => {
        console.log(`Lấy thông tin chat`);
        try {
            const { conversationId } = req.params;
            console.log(` Lấy thông tin chat với ID: ${conversationId}`);
            const chat = await Conversation.findById(conversationId).populate('participants.userId');
            if (!chat) {
                console.log(` Chat ID ${conversationId} không tồn tại`);
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
            // 1. Lấy conversation và populate participant.userId
            const conversation = await Conversation.findById(conversationId).populate("participants.userId");
            if (!conversation) {
                return res.status(404).json({ message: "Không tìm thấy cuộc trò chuyện" });
            }

            // 2. Lấy danh sách userID đã tham gia
            const currentParticipantIDs = conversation.participants
                .map(p => p?.userId?.userID) // đảm bảo đúng trường
                .filter(Boolean);

            // 3. Gọi API lấy toàn bộ users và profiles
            const [userRes, profileRes] = await Promise.all([
                axios.get("http://localhost:3000/api/users"),
                axios.get("http://localhost:3000/api/profiles")
            ]);

            const allUsers = userRes.data || [];
            const allProfiles = profileRes.data || [];

            // 4. Merge profile vào user theo userID
            const usersWithProfiles = allUsers.map(user => {
                const profile = allProfiles.find(p => p.userID === user.userID);
                return {
                    ...user,
                    firstName: profile?.firstName || "",
                    lastName: profile?.lastName || "",
                    image: profile?.image || "",
                    numberPhone: profile?.numberPhone || "",
                    gender: profile?.gender || "",
                    profileID: profile?.profileID || ""
                };
            });

            // 5. Lọc ra những user chưa tham gia
            const availableMembers = usersWithProfiles.filter(user => {
                return !currentParticipantIDs.includes(user.userID);
            });

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
            const { conversationId } = req.params;
            const { userId, role } = req.body;
            console.log(` Thêm user ${userId} với vai trò ${role} vào chat ${conversationId}`);
            const chat = await Conversation.findByIdAndUpdate(conversationId, { $push: { participants: { userId, role } } }, { new: true });
            console.log(` Chat sau khi thêm thành viên:`, chat);
            res.json(chat);
        } catch (error) {
            console.error(` Lỗi khi thêm thành viên:`, error);
            res.status(500).json({ error: error.message });
        }
    },

    removeParticipant: async (req, res) => {
        try {
            const { conversationId } = req.params;
            const { userId } = req.body;

            console.log(`Xóa user ${userId} khỏi chat ${conversationId}`);
            console.log("Body nhận được:", req.body);

            // Kiểm tra nếu không có userId
            if (!userId) {
                return res.status(400).json({ error: "Thiếu userId!" });
            }

            // Xóa userId khỏi danh sách participants
            const chat = await Conversation.findByIdAndUpdate(
                conversationId,
                { $pull: { participants: { userId: userId } } },
                { new: true }
            );

            if (!chat) {
                console.error(`Không tìm thấy chat với ID: ${conversationId}`);
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
            const { conversationId } = req.params;
            const { userId, role } = req.body;
            console.log(`Thay đổi vai trò của user ${userId} thành ${role} trong chat ${conversationId}`);

            const chat = await Conversation.findOneAndUpdate({ _id: conversationId, 'participants.userId': userId }, { $set: { 'participants.$.role': role } }, { new: true });
            console.log(` Chat sau khi thay đổi vai trò:`, chat);

            res.json(chat);
        } catch (error) {
            console.log(` Lỗi khi thay đổi vai trò:`, error);

            res.status(500).json({ error: error.message });
        }
    },

    transferGroupAdmin: async (req, res) => {
        try {
            const { conversationId } = req.params;
            const { newAdminUserId, requesterUserId } = req.body;

            console.log(`Yêu cầu chuyển quyền trưởng nhóm trong chat ${conversationId} cho user ${newAdminUserId} từ user ${requesterUserId} (TRỰC TIẾP TỪ BODY)`);

            // 1. Tìm cuộc trò chuyện
            const conversation = await Conversation.findById(conversationId);
            if (!conversation) {
                return res.status(404).json({ message: 'Không tìm thấy cuộc trò chuyện.' });
            }

            // 2. Xác minh người yêu cầu là trưởng nhóm hiện tại
            const currentAdmin = conversation.participants.find(
                (p) => p.userId.toString() === requesterUserId && p.role === 'admin'
            );

            if (!currentAdmin) {
                return res.status(403).json({ message: 'Bạn không có quyền chuyển quyền trưởng nhóm.' });
            }

            // 3. Tìm người dùng mới
            const newAdmin = conversation.participants.find(
                (p) => p.userId.toString() === newAdminUserId
            );

            if (!newAdmin) {
                return res.status(404).json({ message: 'Không tìm thấy người dùng này trong cuộc trò chuyện.' });
            }

            let updatedConversation;

            try {
                // 4. Cập nhật vai trò của trưởng nhóm hiện tại thành thành viên
                const demoteResult = await Conversation.updateOne(
                    { _id: conversationId, 'participants.userId': requesterUserId },
                    { $set: { 'participants.$.role': 'member' } }
                );

                if (demoteResult.modifiedCount === 0) {
                    console.warn('Không thể hạ vai trò của trưởng nhóm hiện tại.');
                }

                // 5. Cập nhật vai trò của người dùng mới thành trưởng nhóm
                const promoteResult = await Conversation.updateOne(
                    { _id: conversationId, 'participants.userId': newAdminUserId },
                    { $set: { 'participants.$.role': 'admin' } }
                );

                if (promoteResult.modifiedCount === 0) {
                    return res.status(400).json({ message: 'Không thể chuyển quyền trưởng nhóm.' });
                }

                // 6. Lấy lại thông tin cuộc trò chuyện đã cập nhật
                updatedConversation = await Conversation.findById(conversationId);
                if (!updatedConversation) {
                    console.error('Lỗi: Không thể tìm thấy cuộc trò chuyện sau khi cập nhật.');
                    return res.status(500).json({ error: 'Lỗi khi lấy thông tin cuộc trò chuyện đã cập nhật.' });
                }

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
                messageType: { $in: ['image', 'video'] }
            });

            console.log(`Lấy danh sách media trong chat ${conversationId}:`, media);
            res.json(media.length ? media : []); // Trả về mảng rỗng nếu không có dữ liệu
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
                messageType: 'file'
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
                messageType: 'link'
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

            // Lấy tất cả messageType là image, video, file hoặc link
            const messages = await Message.find({
                conversationId: conversationId,
                messageType: { $in: ['image', 'video', 'file', 'link'] }
            });

            // Phân loại dữ liệu theo từng nhóm
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
                links: links.length
            });

            res.json({
                media,
                files,
                links
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

            console.log(`Cập nhật trạng thái ghim nhóm ${conversationId} thành ${isPinned}`);
            const chat = await Conversation.findOneAndUpdate(
                { _id: conversationId, 'participants.userId': userId },
                { $set: { 'participants.$.isPinned': isPinned } },
                { new: true }
            );

            console.log(`Chat sau khi cập nhật trạng thái ghim:`, chat);

            if (!chat) {
                return res.status(404).json({ message: 'Conversation not found' });
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
            console.log(` Lấy danh sách nhắc hẹn trong chat ${conversationId}`);
            const reminders = await Message.find({ conversationId: conversationId, 'message.messageType': 'reminder' });
            console.log(` Danh sách nhắc hẹn:`, reminders);
            res.json(reminders);
        } catch (error) {
            console.log(` Lỗi khi lấy danh sách nhắc hẹn:`, error);
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
            );

            console.log(`Chat sau khi cập nhật trạng thái thông báo:`, chat);
            res.json(chat);
        } catch (error) {
            console.log(`Lỗi khi cập nhật trạng thái thông báo nhóm:`, error);
            res.status(500).json({ error: error.message });
        }
    },
    updateNotification: async (req, res) => {
        try {
            const { conversationId } = req.params; // Lấy ID cuộc trò chuyện từ tham số
            const { userId, mute } = req.body; // Lấy userId và trạng thái mute từ body yêu cầu

            // Cập nhật trạng thái mute cho người dùng cụ thể trong participants
            const chat = await Conversation.findOneAndUpdate(
                { _id: conversationId, 'participants.userId': userId }, // Tìm cuộc trò chuyện và người dùng
                { $set: { 'participants.$.mute': mute } }, // Cập nhật trạng thái mute
                { new: true } // Trả về tài liệu đã được cập nhật
            );

            if (!chat) {
                return res.status(404).json({ message: "Cuộc trò chuyện không tìm thấy!" });
            }

            console.log(`Chat sau khi cập nhật trạng thái thông báo:`, chat);
            res.json(chat); // Trả về thông tin cuộc trò chuyện đã cập nhật
        } catch (error) {
            console.log(`Lỗi khi cập nhật trạng thái thông báo nhóm:`, error);
            res.status(500).json({ error: error.message }); // Trả về lỗi nếu có
        }
    },
    // Ẩn trò chuyện
    hideChat: async (req, res) => {
        try {
            const { conversationId } = req.params;
            const { userId, isHidden, pin } = req.body;

            if (!userId) {
                return res.status(400).json({ error: "Thiếu userId" });
            }

            const chat = await Conversation.findById(conversationId);
            if (!chat) {
                return res.status(404).json({ error: "Không tìm thấy cuộc trò chuyện" });
            }

            const participant = chat.participants.find(p => p.userId === userId);
            if (!participant) {
                return res.status(404).json({ error: "Người dùng không thuộc cuộc trò chuyện này" });
            }

            participant.isHidden = isHidden;
            if (isHidden && pin) {
                const saltRounds = 10;
                participant.pin = await bcrypt.hash(pin, saltRounds); // Băm mã PIN
            } else if (!isHidden) {
                participant.pin = null; // Xóa mã PIN khi hiện lại
            }

            chat.updateAt = Date.now();
            await chat.save();

            res.json(chat);
        } catch (error) {
            console.error("Lỗi khi ẩn/hiện trò chuyện:", error);
            res.status(500).json({ error: error.message });
        }
    },
    deleteSelectedMessagesForMe: async (req, res) => {
        try {
            const { messageIds, userId } = req.body; // Lấy userId từ body

            console.log("Message IDs từ body:", messageIds); // Kiểm tra messageIds từ body
            console.log("User ID từ body:", userId); // Kiểm tra userId từ body
            if (!userId) {
                return res.status(400).json({ message: "Vui lòng cung cấp userId trong body." });
            }

            if (!Array.isArray(messageIds) || messageIds.length === 0) {
                return res.status(400).json({ message: "Vui lòng chọn ít nhất một tin nhắn để xóa." });
            }

            console.log("Message IDs từ body:", messageIds);
            console.log("User ID từ body:", userId);
            console.log(`User ${userId} đang cố gắng xóa các tin nhắn ${messageIds} chỉ ở phía họ.`);

            const messages = await Message.find({ _id: { $in: messageIds } });

            if (!messages || messages.length === 0) {
                return res.status(404).json({ message: "Không tìm thấy tin nhắn nào với ID đã cung cấp." });
            }

            const updatePromises = messages.map(async (message) => {
                if (!message.deletedBy.includes(userId)) {
                    message.deletedBy.push(userId);
                    return message.save();
                }
                return null; // Tin nhắn đã bị xóa bởi người dùng này
            });

            await Promise.all(updatePromises);

            res.json({ message: `Đã ẩn ${updatePromises.filter(p => p !== null).length} tin nhắn khỏi lịch sử của bạn.` });

        } catch (error) {
            console.error("Lỗi khi xóa nhiều tin nhắn:", error);
            res.status(500).json({ error: error.message });
        }
    },

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

            res.json({ message: `Đã ẩn toàn bộ tin nhắn trong cuộc trò chuyện ${conversationId}.` });

        } catch (error) {
            console.error("Lỗi khi xóa:", error);
            res.status(500).json({ error: error.message });
        }
    },

    // Xóa toàn bộ tin nhắn trong cuộc trò chuyện (phía người gửi)
    deleteChatHistoryForMe: async (req, res) => {
        try {
            const { conversationId } = req.params;
            const { userId } = req.body;

            if (!userId) {
                return res.status(400).json({ error: "Thiếu userId!" });
            }

            const userIdStr = String(userId); // Ép kiểu để tránh lỗi

            const result = await Message.updateMany(
                { conversationId: conversationId },
                { $addToSet: { deletedBy: userIdStr } }
            );

            res.json({ message: "Lịch sử trò chuyện đã bị xóa khỏi tài khoản của bạn." });
        } catch (error) {
            console.error("Lỗi khi xóa lịch sử trò chuyện:", {
                message: error.message,
                stack: error.stack
            });
            res.status(500).json({ error: "Lỗi server nội bộ.", details: error.message });
        }
    },


    // Nhóm chung của các user trong conversationId

    getCommonGroups: async (req, res) => {
        try {
            const { conversationId } = req.params;
            console.log(`Lấy danh sách nhóm chung với conversationId: ${conversationId}`);

            // Lấy thông tin cuộc hội thoại hiện tại
            const currentConversation = await Conversation.findById(conversationId).populate('participants.userId');
            if (!currentConversation) {
                console.log(`Cuộc hội thoại với ID ${conversationId} không tồn tại`);
                return res.status(404).json({ message: 'Cuộc hội thoại không tồn tại' });
            }

            // Lấy danh sách userId từ participants
            const participantIds = currentConversation.participants.map(p => p.userId.toString());
            console.log(`Danh sách userId trong cuộc hội thoại:`, participantIds);

            // Tìm tất cả các nhóm mà tất cả participantIds cùng tham gia
            const commonGroups = await Conversation.find({
                _id: { $ne: conversationId }, // Loại trừ cuộc hội thoại hiện tại
                isGroup: true, // Chỉ lấy các nhóm
                'participants.userId': { $all: participantIds } // Tất cả userId phải có trong participants
            }).populate('participants.userId'); // Populate để lấy đầy đủ thông tin user nếu cần

            console.log(`Danh sách nhóm chung:`, commonGroups);

            res.json({
                currentConversation,
                commonGroups // Trả về đầy đủ thông tin của các nhóm
            });
        } catch (error) {
            console.error(`Lỗi khi lấy danh sách nhóm chung:`, error);
            res.status(500).json({ error: error.message });
        }
    },


};