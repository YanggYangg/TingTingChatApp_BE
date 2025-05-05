const onlineUsers = new Map();

export const handleSocketConnection = (io) => {
  io.on("connection", (socket) => {
    console.log("🔌 New client connected:", socket.id);

    socket.on("add_user", (userId) => {
      console.log("📥 User connected:", userId);
      onlineUsers.set(userId, socket.id);
    });



    socket.on("disconnect", () => {
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          onlineUsers.delete(userId);
          break;
        }
      }
      console.log("Client disconnected:", socket.id);
    });
  });
};
