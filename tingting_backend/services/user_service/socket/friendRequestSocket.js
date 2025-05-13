import FriendRequest from "../../user_service/models/friendRequest.model.js";
export const handleSocketConnection = (io) => {
  const onlineUsers = new Map();

  io.on("connection", (socket) => {
    console.log("🔌 New client connected:", socket.id);

    socket.on("add_user", (userId) => {
      console.log("📥 User connected (Socket FriendRequest):", userId);
      onlineUsers.set(userId, socket.id);
    });

    // socket.on(
    //   "send_friend_request",
    //   async ({ fromUserId, toUserId }, callback) => {
    //     try {
    //       // Kiểm tra nếu đã có yêu cầu trùng
    //       const existingRequest = await FriendRequest.findOne({
    //         requester: fromUserId,
    //         recipient: toUserId,
    //         status: "pending", // chỉ check nếu chưa bị xử lý
    //       });

    //       if (existingRequest) {
    //         console.log("❗ Lời mời đã tồn tại");
    //         return callback?.({ status: "exists" });
    //       }

    //       // Lưu DB
    //       const newRequest = await FriendRequest.create({
    //         requester: fromUserId,
    //         recipient: toUserId,
    //       });

    //       console.log("✅ Lưu lời mời kết bạn:", newRequest._id);

    //       // Gửi socket tới người nhận nếu online
    //       const recipientSocketId = onlineUsers.get(toUserId);
    //       if (recipientSocketId) {
    //         io.to(recipientSocketId).emit("friend_request_received", {
    //           fromUserId,
    //         });
    //       }

    //       // Trả phản hồi về cho người gửi
    //       callback?.({ status: "ok", requestId: newRequest._id });
    //     } catch (err) {
    //       console.error("❌ Lỗi khi lưu lời mời:", err);
    //       callback?.({ status: "error", message: err.message });
    //     }
    //   }
    // );

    socket.on(
  "send_friend_request",
  async ({ fromUserId, toUserId }, callback) => {
    try {
      const existingRequest = await FriendRequest.findOne({
        requester: fromUserId,
        recipient: toUserId,
        status: "pending",
      });

      if (existingRequest) {
        // Nếu lời mời đã tồn tại => thu hồi (xóa)
        await FriendRequest.findByIdAndDelete(existingRequest._id);
        console.log("🗑️ Đã thu hồi lời mời kết bạn:", existingRequest._id);

        callback?.({ status: "revoked" });

        // Có thể gửi socket báo về người nhận nếu muốn
        const recipientSocketId = onlineUsers.get(toUserId);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit("friend_request_revoked", {
            fromUserId,
          });
        }

        return;
      }

      // Nếu chưa có thì tạo mới
      const newRequest = await FriendRequest.create({
        requester: fromUserId,
        recipient: toUserId,
      });

      console.log("✅ Lưu lời mời kết bạn:", newRequest._id);

      const recipientSocketId = onlineUsers.get(toUserId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("friend_request_received", {
          fromUserId,
        });
      }

      callback?.({ status: "ok", requestId: newRequest._id });
    } catch (err) {
      console.error("❌ Lỗi khi xử lý lời mời:", err);
      callback?.({ status: "error", message: err.message });
    }
  }
);

socket.on("respond_friend_request", async ({ requestId, action, userId }, callback) => {
  try {
    const request = await FriendRequest.findById(requestId);

    if (!request) {
      return callback?.({ status: "not_found" });
    }

    if (request.status !== "pending") {
      return callback?.({ status: "already_handled" });
    }

    if (!["accepted", "rejected"].includes(action)) {
      return callback?.({ status: "invalid_action" });
    }

    // Cập nhật trạng thái
    request.status = action;
    await request.save();

    console.log(`✅ ${action === "accepted" ? "Chấp nhận" : "Từ chối"} lời mời kết bạn:`, requestId);

    const requesterId = request.requester.toString();
    const requesterSocketId = onlineUsers.get(requesterId);

    // Gửi thông báo realtime cho người đã gửi yêu cầu
    if (requesterSocketId) {
      io.to(requesterSocketId).emit("friend_request_responded", {
        requestId,
        action,
        fromUserId: userId, // người phản hồi
        toUserId: requesterId,
      });
    }

    callback?.({ status: "ok" });
  } catch (err) {
    console.error("❌ Lỗi khi phản hồi lời mời:", err);
    callback?.({ status: "error", message: err.message });
  }
});



    socket.on("disconnect", () => {
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          onlineUsers.delete(userId);
          break;
        }
      }
      console.log("Client disconnected (Socket FriendRequest):", socket.id);
    });
  });
};

