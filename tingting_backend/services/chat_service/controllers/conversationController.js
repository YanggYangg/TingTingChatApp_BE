const Conversation = require('../models/Conversation');
const Message = require('../models/Message'); // Import model Message
const axios = require('axios'); // Import axios để gọi API từ UserService


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
    try {
      const groups = await Conversation.find({ isGroup: true });
      console.log("=====Test console Groups=====:", groups);
      res.status(200).json(groups);
    } catch (error) {
      console.log("=====Khong get duoc Groups=====");
      res.status(500).json({ message: "Error when get all groups" });
    }
  },
  getUserJoinGroup: async (req, res) => {
    console.log("Dữ liệu req.params.userId:", req.params.userId);
    const userId = req.params.userId;
    try {
      const userGroups = await Conversation.find({
        isGroup: true,
        "participants.userId": userId
      });
      if (userGroups.length === 0) {
        return res.status(404).json([]);
      }

      res.status(200).json(userGroups);
    } catch (error) {
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
  getOrCreateConversation: async (req, res) => {
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
  },
  // getAllConversationById2: async (req, res) => {
  //     try {
  //         const { userId } = req.params;
  //         const { search } = req.query;

  //         if (!userId) {
  //           return res.status(400).json({ message: 'userId is required' });
  //         }

  //         // Lấy danh sách conversation có user tham gia
  //         let conversations = await Conversation.find({
  //           'participants.userId': userId
  //         })
  //           .populate('participants.userId', 'firstname surname avatar') // Populate user
  //           .sort({ updateAt: -1 })
  //           .lean();

  //         if (!conversations || conversations.length === 0) {
  //           return res.status(404).json({ message: 'No conversations found' });
  //         }

  //         // Nếu có từ khóa tìm kiếm
  //         if (search && search.trim() !== '') {
  //           const keyword = search.toLowerCase();
  //           conversations = conversations.filter(conv => {
  //             if (conv.isGroup) {
  //               return conv.name?.toLowerCase().includes(keyword);
  //             } else {
  //                 const other = conv.participants.find(p => {
  //                     const participant = p.userId;
  //                     // Nếu đã populate thì userId là object => lấy _id, nếu không thì dùng luôn userId
  //                     const id = typeof participant === 'object' && participant !== null ? participant._id : participant;
  //                     return id?.toString() !== userId;
  //                   });
  //               const first = other?.userId?.firstname?.toLowerCase() || '';
  //               const last = other?.userId?.surname?.toLowerCase() || '';
  //               return first.includes(keyword) || last.includes(keyword);
  //             }
  //           });
  //         }

  //         return res.status(200).json(conversations);
  //       } catch (error) {
  //         console.error('Error fetching conversations:', error.message);
  //         return res.status(500).json({ message: 'Error fetching conversations', error: error.message });
  //       }
  // }

  // == Nhi thêm
  // == Nhi thêm
  getAllConversationById2: async (req, res) => {
    try {
      const { userId } = req.params;
      const { search } = req.query;

      if (!userId) {
        return res.status(400).json({ message: "userId is required" });
      }

      // Lấy danh sách hội thoại
      let conversations = await Conversation.find({
        "participants.userId": userId,
      })
        .sort({ updateAt: -1 })
        .lean();

      if (!conversations || conversations.length === 0) {
        return res.status(404).json({ message: "No conversations found" });
      }

      // Debug: Log số lượng hội thoại
      console.log(`Số lượng hội thoại tìm thấy cho user ${userId}: ${conversations.length}`);

      // Lấy tất cả userId duy nhất từ participants
      const userIds = [
        ...new Set(
          conversations.flatMap((conv) =>
            conv.participants
              .filter((p) => p.userId) // Lọc bỏ userId không hợp lệ
              .map((p) => p.userId.toString())
          )
        ),
      ];

      let users = [];
      if (userIds.length > 0) {
        // Gọi API UserService
        try {
          const userResponse = await axios.get(
            `http://localhost:3001/api/v1/profile?ids=${userIds.join(",")}`
          );
          console.log("Dữ liệu trả về từ UserService:", userResponse.data);
          // Kiểm tra cấu trúc dữ liệu trả về
          users = Array.isArray(userResponse.data.users)
            ? userResponse.data.users
            : Array.isArray(userResponse.data?.data?.users)
              ? userResponse.data.data.users
              : [];
        } catch (error) {
          console.error("Error calling UserService:", error.message);
          // Tiếp tục với users rỗng nếu UserService thất bại
          users = [];
        }
      }

      // Debug: Log số lượng users
      console.log(`Số lượng người dùng lấy được: ${users.length}`);

      // Tạo map để tra cứu thông tin người dùng
      const userMap = users.reduce((map, user) => {
        if (user && user._id) {
          map[user._id.toString()] = user;
        }
        return map;
      }, {});

      // Debug: Log các userId trong userMap
      console.log(`UserMap keys: ${Object.keys(userMap).join(", ")}`);

      // Gắn thông tin người dùng vào participants
      conversations = conversations.map((conv) => ({
        ...conv,
        participants: conv.participants.map((p) => {
          const userData = userMap[p.userId.toString()] || {};
          return {
            ...p,
            userId: {
              _id: p.userId,
              firstname: userData.firstname || "Unknown",
              surname: userData.surname || "",
              avatar: userData.avatar || null,
            },
          };
        }),
      }));

      // Nếu có từ khóa tìm kiếm
      if (search && search.trim() !== "") {
        const keyword = search.trim().toLowerCase();
        // Sử dụng RegExp để tìm kiếm tương đối, hỗ trợ dấu tiếng Việt
        const regex = new RegExp(
          keyword
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          "i"
        );

        conversations = conversations.filter((conv) => {
          if (conv.isGroup) {
            const normalizedName = conv.name
              ? conv.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
              : "";
            const matches = normalizedName.match(regex);
            console.log(
              `Nhóm ${conv._id}: name=${conv.name}, normalized=${normalizedName}, matches=${!!matches}`
            );
            return matches;
          } else {
            const otherParticipant = conv.participants.find(
              (p) => p.userId._id.toString() !== userId
            );
            if (otherParticipant) {
              const firstName =
                otherParticipant.userId.firstname?.toLowerCase() || "";
              const lastName =
                otherParticipant.userId.surname?.toLowerCase() || "";
              const fullName = `${firstName} ${lastName}`
                .trim()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");
              // Kiểm tra khớp với fullName, firstName hoặc lastName
              const matches =
                fullName.match(regex) ||
                firstName.match(regex) ||
                lastName.match(regex);
              console.log(
                `1:1 ${conv._id}: firstName=${firstName}, lastName=${lastName}, fullName=${fullName}, matches=${!!matches}`
              );
              return matches;
            }
            console.warn(
              `Không tìm thấy otherParticipant trong cuộc trò chuyện 1:1 ${conv._id}`
            );
            return false;
          }
        });
      }

      // Format kết quả trả về
      const formattedConversations = conversations.map((conv) => {
        let displayName = "";
        let avatar = null;
        if (conv.isGroup) {
          displayName = conv.name || "Unnamed Group";
          avatar = conv.groupImage || null;
        } else {
          const otherParticipant = conv.participants.find(
            (p) => p.userId._id.toString() !== userId
          );
          if (!otherParticipant) {
            console.warn(`No other participant found in conversation ${conv._id}`);
            displayName = "Unknown User";
          } else {
            displayName =
              `${otherParticipant.userId.firstname || "Unknown"} ${otherParticipant.userId.surname || ""
                }`.trim() || "Unknown User";
            avatar = otherParticipant.userId.avatar || null;
          }
        }

        return {
          ...conv,
          displayName,
          avatar,
        };
      });

      // Debug: Log số lượng và loại cuộc trò chuyện trả về
      console.log(
        `Số lượng cuộc trò chuyện trả về: ${formattedConversations.length}`
      );
      console.log(
        `Cuộc trò chuyện nhóm: ${formattedConversations.filter((c) => c.isGroup).length
        }, 1:1: ${formattedConversations.filter((c) => !c.isGroup).length}`
      );

      return res.status(200).json(formattedConversations);
    } catch (error) {
      console.error("Error fetching conversations:", error.message);
      return res.status(500).json({
        message: "Error fetching conversations",
        error: error.message,
      });
    }
  }
};
