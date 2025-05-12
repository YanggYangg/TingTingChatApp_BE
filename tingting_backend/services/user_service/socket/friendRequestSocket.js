export const handleSocketConnection = (io) => {
  const onlineUsers = new Map();

  io.on("connection", (socket) => {
    console.log("🔌 New client connected:", socket.id);

    socket.on("add_user", (userId) => {
      console.log("📥 User connected (Socket FriendRequest):", userId);
      onlineUsers.set(userId, socket.id);
    });

     // 🟡 Khi gửi lời mời kết bạn
     socket.on("send_friend_request", ({ fromUserId, toUserId }) => {
      const recipientSocketId = onlineUsers.get(toUserId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("friend_request_received", {
          fromUserId,
        });
      }
    });

      // 🟢 Khi phản hồi lời mời kết bạn
      socket.on("respond_friend_request", ({ fromUserId, toUserId, action }) => {
        const requesterSocketId = onlineUsers.get(fromUserId);
        if (requesterSocketId) {
          io.to(requesterSocketId).emit("friend_request_responded", {
            toUserId,
            action, // 'accepted' | 'rejected'
          });
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
