const Conversation = require('../models/Conversation');
const Message = require('../models/Message'); // Import model Message

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
        console.log("Dữ liệu req.params.userId:", req.params.userId);
        const userId = req.params.userId;
        try{
            const userGroups = await Conversation.find({
                isGroup: true,
                "participants.userId": userId 
            });
            if (userGroups.length === 0) {
                return res.status(404).json([]);
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
    deleteConversationHistory: async (req, res) => {
        const { conversationId } = req.params;
        // const userId = req.user._id; // Không sử dụng userId nữa
      
        try {
          // 1. Tìm cuộc trò chuyện
          const conversation = await Conversation.findById(conversationId);
          if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found' });
          }
      
          // 2. Bỏ qua bước kiểm tra quyền
      
          // 3. Xóa tất cả tin nhắn liên quan đến cuộc trò chuyện
          const deleteResult = await Message.deleteMany({ conversationId: conversationId });
      
          // 4. Không xóa cuộc trò chuyện
      
          res.status(200).json({
            message: `Message history for conversation ID ${conversationId} has been deleted successfully.`,
            deletedMessagesCount: deleteResult.deletedCount,
          });
      
        } catch (error) {
          console.error('Error deleting conversation history:', error);
          res.status(500).json({ message: 'Internal server error' });
        }
    },
    disbandGroup: async (req, res) => {
        const { conversationId } = req.params;
        const { userId } = req.body; // Assuming the user's ID is in the request body

        try {
            // 1. Find the conversation
            const conversation = await Conversation.findById(conversationId);
            if (!conversation) {
                return res.status(404).json({ message: 'Conversation not found' });
            }

            // 2. Check if it's a group conversation
            if (!conversation.isGroup) {
                return res.status(400).json({ message: 'This is not a group conversation' });
            }

            // Bỏ bước kiểm tra quyền admin

            // 4. Delete the conversation
            await Conversation.findByIdAndDelete(conversationId);

            res.status(200).json({ message: 'Group disbanded successfully' });
        } catch (error) {
            console.error('Error disbanding group:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    getOrCreateConversation: async(req, res) => {
        console.log("Dữ liệu nhận được từ frontend:", req.body);
        const { user1Id, user2Id } = req.body;
        if (!user1Id || !user2Id) {
            return res.status(400).json({ error: "Missing user IDs" });
        }
        try {
            // 1. Tìm cuộc trò chuyện cá nhân (isGroup = false) giữa 2 user
            let conversation = await Conversation.findOne({
              isGroup: false,
              participants: {
                $all: [
                  { $elemMatch: { userId: user1Id } },
                  { $elemMatch: { userId: user2Id } },
                ],
              },
            });
            console.log("=====Test console Conversation=====:", conversation);
        
            // 2. Nếu chưa có thì tạo mới
            if (!conversation) {
              conversation = await Conversation.create({
                isGroup: false,
                participants: [
                  { userId: user1Id },
                  { userId: user2Id },
                ],
              });
            }
            console.log("TẠO CONVERSATION MỚI:");
        
            return res.status(200).json({ conversationId: conversation._id });
          } catch (error) {
            console.error("Error in getOrCreateConversation:", error);
            return res.status(500).json({ error: "Internal server error" });
          }
    }
};
