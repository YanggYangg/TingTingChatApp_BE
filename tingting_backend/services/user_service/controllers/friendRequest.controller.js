import Profile from "../models/profile.model.js";
import FriendRequest from "../models/friendRequest.model.js";

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
    request.status = action;
    await request.save();

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

    const receivedRequests = await FriendRequest.find({ recipient: userId})
    .populate("requester", "firstname surname phone avatar")
    .sort({ createdAt: -1 });
    res.status(200).json({ message: "Received friend requests", data: receivedRequests });
  }catch (error) {
    res.status(500).json({ message: error.message });
  }
};
