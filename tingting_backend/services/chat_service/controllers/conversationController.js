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
    },
    getAllGroups: async (req, res) => {
        try{
            const groups = await Conversation.find({ isGroup: true });
            console.log("=====Test console Groups=====:", groups);
            res.status(200).json(groups);
        }catch(error){
            console.log("=====Khong get duoc Groups=====");
            res.status(500).json({ message: "Error when get all groups" });
        }
    },
    getUserJoinGroup: async (req, res) => {
        const userId = req.params.userId;
        try{
            const userGroups = await Conversation.find({
                isGroup: true,
                "participants.userId": userId 
            });
            if (userGroups.length === 0) {
                return res.status(404).json({ message: 'Người dùng không tham gia nhóm nào.' });
              }
          
              res.status(200).json(userGroups);
        }catch (error) {
            console.error('Lỗi khi lấy nhóm người dùng tham gia:', error);
            res.status(500).json({ message: 'Đã xảy ra lỗi khi lấy thông tin nhóm.' });
          }

    },
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
    createConversation2: async (req, res) => {
        try {
            const newConversation = new Conversation(req.body);
            const savedConversation = await newConversation.save();
            res.status(201).json({ success: true, data: savedConversation }); // Response thành công
        } catch (error) {
            console.error("Lỗi khi tạo cuộc trò chuyện:", error);
            res.status(500).json({ success: false, message: "Lỗi khi tạo cuộc trò chuyện", error: error.message }); // Response lỗi
        }
    },
    getAllConversationById: async (req, res) => {
        try {
            // Lấy userId từ query params hoặc body (tùy cách bạn thiết kế API)
            const { userId } = req.params;

            if (!userId) {
                return res.status(400).json({ message: 'userId is required' });
            }

            // Tìm các cuộc trò chuyện mà userId nằm trong mảng participants
            const conversations = await Conversation.find({
                'participants.userId': userId,
            })
                .sort({ updateAt: -1 }) // Sắp xếp theo thời gian cập nhật (mới nhất trước)
                .lean(); // Chuyển đổi sang plain JavaScript object để xử lý nhanh hơn

            if (!conversations || conversations.length === 0) {
                return res.status(404).json({ message: 'No conversations found for this user' });
            }

            // Trả về danh sách cuộc trò chuyện
            res.status(200).json(conversations);
        } catch (error) {
            console.error('Error fetching conversations:', error.message);
            res.status(500).json({ message: 'Error fetching conversations', error: error.message });
        }
    },

};
