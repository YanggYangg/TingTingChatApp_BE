import FriendRequest from "../../user_service/models/friendRequest.model.js";
export const handleSocketConnection = (io) => {
  const onlineUsers = new Map();

  io.on("connection", (socket) => {
    console.log("🔌 New client connected:", socket.id);

    socket.on("add_user", (userId) => {
      console.log("📥 User connected (Socket FriendRequest):", userId);
      onlineUsers.set(userId, socket.id);
    });

    //send_friend_request
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

             // Gửi socket cho người gửi để cập nhật trạng thái UI
  const senderSocketId = onlineUsers.get(fromUserId);
  if (senderSocketId) {
    io.to(senderSocketId).emit("friend_request_revoked_self", {
      toUserId,
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

          // Gửi cho người gửi để cập nhật trạng thái là `pending`
const senderSocketId = onlineUsers.get(fromUserId);
if (senderSocketId) {
  io.to(senderSocketId).emit("friend_request_sent", {
    toUserId,
  });
}

          callback?.({ status: "ok", requestId: newRequest._id });
        } catch (err) {
          console.error("❌ Lỗi khi xử lý lời mời:", err);
          callback?.({ status: "error", message: err.message });
        }
      }
    );

    //respond_friend_request
    socket.on(
      "respond_friend_request",
      async ({ requestId, action, userId }, callback) => {
        try {
          const request = await FriendRequest.findById(requestId);
          if (!request) {
            return callback?.({
              status: "error",
              message: "Lời mời không tồn tại.",
            });
          }

          if (request.recipient.toString() !== userId) {
            return callback?.({
              status: "error",
              message: "Bạn không có quyền xử lý lời mời này.",
            });
          }

          if (action === "accepted") {
            request.status = "accepted";
            await request.save();

            // Gửi socket về người gửi nếu họ online
            const requesterSocketId = onlineUsers.get(
              request.requester.toString()
            );
            if (requesterSocketId) {
              io.to(requesterSocketId).emit("friend_request_accepted", {
                fromUserId: userId,
              });
            }

            // THÊM PHÍA NGƯỜI NHẬN:
            const recipientSocketId = onlineUsers.get(userId);
            if (recipientSocketId) {
              io.to(recipientSocketId).emit("friend_request_accepted", {
                fromUserId: request.requester.toString(),
              });
            }

            callback?.({ status: "accepted" });
          } else if (action === "rejected") {
            await FriendRequest.findByIdAndDelete(requestId);

            const requesterSocketId = onlineUsers.get(
              request.requester.toString()
            );
            if (requesterSocketId) {
              io.to(requesterSocketId).emit("friend_request_rejected", {
                fromUserId: userId,
              });
            }

            callback?.({ status: "rejected" });
          } else {
            callback?.({ status: "error", message: "Hành động không hợp lệ." });
          }
        } catch (err) {
          console.error("❌ Lỗi khi phản hồi lời mời:", err);
          callback?.({ status: "error", message: err.message });
        }
      }
    );

    //unfriend
    // unfriend
socket.on("unfriend", async ({ userId1, userId2 }, callback) => {
  try {
    const deleted = await FriendRequest.findOneAndDelete({
      $or: [
        { requester: userId1, recipient: userId2, status: "accepted" },
        { requester: userId2, recipient: userId1, status: "accepted" },
      ],
    });

    if (!deleted) {
      return callback?.({
        status: "error",
        message: "Không tìm thấy mối quan hệ để xóa.",
      });
    }

    // Gửi thông báo realtime tới cả hai người nếu họ đang online
    const socket1 = onlineUsers.get(userId1);
    const socket2 = onlineUsers.get(userId2);

    if (socket1) {
      io.to(socket1).emit("unfriended", { byUserId: userId2 });
    }
    if (socket2) {
      io.to(socket2).emit("unfriended", { byUserId: userId1 });
    }

    callback?.({ status: "ok" });
  } catch (err) {
    console.error("❌ Lỗi khi xóa bạn:", err);
    callback?.({ status: "error", message: err.message });
  }
});



    //disconnect
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
