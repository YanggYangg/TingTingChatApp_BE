import Profile from "../models/profile.model.js";
import FriendRequest from "../models/friendRequest.model.js";
import axios from 'axios';

export const sendFriendRequest = async (req, res) => {
  try {
    const { requesterPhone, recipientPhone } = req.body;
    //Kiem tra neu nguoi gui va nguoi nhan co trung so dien thoai
    if (requesterPhone === recipientPhone) {
      return res.status(400).json({ message: "You cannot friend yourself!" });
    }

    // Tìm user từ số điện thoại
    const requester = await Profile.findOne({ phone: requesterPhone });
    const recipient = await Profile.findOne({ phone: recipientPhone });

    if (!requester) {
      return res.status(404).json({ message: "Requester not found" });
    }

    if (!recipient) {
      return res.status(404).json({ message: "Recipient not found" });
    }
    // Kiểm tra nếu đã có lời mời kết bạn
    const existingRequest = await FriendRequest.findOne({
      requester: requester._id,
      recipient: recipient._id,
    });

    if (existingRequest) {
      return res.status(400).json({ message: "Request already sent." });
    }

    // Tạo lời mời kết bạn mới
    const newRequest = await FriendRequest.create({
      requester: requester._id,
      recipient: recipient._id,
    });

    return res
      .status(201)
      .json({ message: "Friend request sent", data: newRequest });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const respondToFriendRequest = async (req, res) => {
  try {
    const { requestId, action, userId } = req.body;
    //userId : la ID cua nguoi dang dang nhap (recipient)
    if (!["accepted", "rejected"].includes(action)) {
      return res.status(400).json({ message: "Invalid action" });
    }

    const request = await FriendRequest.findById(requestId);
    console.log("Trạng thái trước khi: ", request);
    if (!request) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    // Chi nguoi nhan moi duoc phan hoi loi moi
    if (request.recipient.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "You are not authorized to respond to this request" });
    }

    if (request.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Friend request already handled" });
    }

    if (action === "rejected") {
      await FriendRequest.findByIdAndDelete(requestId);
      return res.status(200).json({
        message: "Friend request rejected and deleted",
      });
    }

    request.status = action;
    await request.save();
    
    //Neu chap nhan => goi sang chat_service de tao conversation
    if(action === "accepted"){
      try {
        await axios.post('http://localhost:5000/conversations/createConversation', {
          isGroup: false,
          participants:[
            {userId: request.requester.toString()},
            {userId: request.recipient.toString()},
          ]
      });
      console.log("Tạo conversation thành công!");
      }catch (err) {
        console.error("Không thể tạo conversation:", err.message);
      }
    }

    return res.status(200).json({
      message: `Friend request ${action}`,
      data: request,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

//Loi moi da gui 
export const getSentRequests = async (req, res) => {
  try {
    const { userId } = req.params;
    //Tim all requester da gui tu userId
    const sentRequests = await FriendRequest.find({ requester: userId })
    .populate("recipient", "firstname surname phone avatar")
    .sort({ createdAt: -1 });
    res.status(200).json({ message: "Sent friend requests", data: sentRequests });
  }catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//Loi moi da nhan
export const getReceivedRequests = async (req, res) => {
  try{
    const { userId } = req.params;

    const receivedRequests = await FriendRequest.find({ 
      recipient: userId,
      status: "pending" // Chi lay yeu cau ket ban dang cho
    })
    .populate("requester", "firstname surname phone avatar")
    .sort({ createdAt: -1 });
    res.status(200).json({ message: "Received friend requests", data: receivedRequests });
  }catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//Tat ca ban be cua user
export const getFriends = async (req, res) => {
  try{
    const { userId } = req.params;
    //Tim all friend đa accepted (user la requester hoac recipient)
    const friends = await FriendRequest.find({
      status: "accepted",
      $or: [
        { requester: userId },
        { recipient: userId }
      ]
    })
    .populate("requester", "firstname surname phone avatar")
    .populate("recipient", "firstname surname phone avatar");

    //Map tra ve ds bbe (ko phan biet ai gui ai nhan)
    const result = friends.map(req => {
      const friend = 
      req.requester._id.toString() === userId 
      ? req.recipient
      : req.requester;
      return friend;
    });
    res.status(200).json({ message: "Your friends", data: result });
  }catch (error) {
    res.status(500).json({ message: error.message });
  }
}

//Thu hoi
export const cancelFriendRequest = async (req, res) => {
  try{
    const { requesterId, recipientId } = req.body;
    //Check loi moi co ton tai khong 
    const existingRequest = await FriendRequest.findOne({
      requester: requesterId,
      recipient: recipientId,
      status: "pending",
    });

    if (!existingRequest) {
      return res.status(404).json({ message: "No pending friend request found" });
    }

    //Xoa loi moi
    await FriendRequest.deleteOne({ _id: existingRequest._id });
    return res.status(200).json({ message: "Friend request canceled successfully." });
  }catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

//Huy ket ban
export const unfriend = async (req, res) => {
  try{
    console.log("Dữ liệu nhận được từ frontend:", req.body);
    const { userId1, userId2 } = req.body;

    const deleted = await FriendRequest.findOneAndDelete({
      status: "accepted",
      $or: [
        { requester: userId1, recipient: userId2 },
        { requester: userId2, recipient: userId1 }
      ]
    });

    if(!deleted) {
      return res.status(404).json({ message: "No friendship found to unfriend" });
    }

    //return res.status(200).json({ message: "Unfriended successfully" });
    return res.status(200).json({
      message: "Unfriended successfully",
      data: {
        requester: deleted.requester,
        recipient: deleted.recipient,
      },
    });
  }catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//Lay tat ca yeu cau ket ban cua ng nhan
export const getFriendRequestsForUser = async (req, res) => {
  try{
    const { userId } = req.params;
    const requests = await FriendRequest.find({
      recipient: userId,
      status: "pending", // Lọc yêu cầu kết bạn có trạng thái pending
    });
    if (!requests) {
      return res.status(404).json({ message: "No pending friend requests" });
    }

    return res.status(200).json(requests);
  }catch(error) {
    res.status(500).json({ message: error.message });
  }
}

//Check tinh trang giua 2 user
export const checkFriendStatus = async (req, res) => {
  try{
    const { userIdA, userIdB } = req.body;

    if(!userIdA || !userIdB){
      return res.status(400).json({ message: "Both user IDs are required." });
    }

    //Check ton tai user
    const [userA, userB] = await Promise.all([
      Profile.findById(userIdA),
      Profile.findById(userIdB),
    ]);

    if (!userA || !userB) {
      return res.status(404).json({ message: "One or both users not found." });
    }
    // Tim mqh 2 user
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { requester: userIdA, recipient: userIdB },
        { requester: userIdB, recipient: userIdA },
      ],
    });
    if (!existingRequest) {
      return res.status(200).json({ status: "not_friends" });
    }

    return res.status(200).json({ status: existingRequest.status });
  }catch (error) {
    console.error("Error checking friend status:", error);
    res.status(500).json({ message: "Server error" });
  }
}

//Danh sach bbe
export const getFriendsList = async (req, res) => {
  try {
    const userId = req.params.userId;

    const requests = await FriendRequest.find({
      status: "accepted",
      $or: [
        { requester: userId },
        { recipient: userId },
      ],
    }).populate("requester recipient", "firstname surname avatar phone");

    const friends = requests.map((req) => {
      const friend =
        req.requester._id.toString() === userId ? req.recipient : req.requester;
      return {
        _id: friend._id,
        name: `${friend.firstname} ${friend.surname}`,
        avatar: friend.avatar,
        phone: friend.phone,
      };
    });

    return res.status(200).json({ data: friends });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const getSentPendingRequests = async (req, res) => {
  try {
    const { userId } = req.params;

    const pendingRequests = await FriendRequest.find({
      requester: userId,
      status: "pending"
    })
      .populate("recipient", "firstname surname phone avatar")
      .sort({ createdAt: -1 });

    res.status(200).json({ message: "Pending sent friend requests", data: pendingRequests });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}



