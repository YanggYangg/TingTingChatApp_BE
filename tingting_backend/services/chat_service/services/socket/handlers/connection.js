// src/services/socket/handlers/connection.js
const logger = require("../../../utils/logger");

const userSocketMap = {};

module.exports = {
  handleConnection(socket, io) {
    const userId = socket.handshake.query.userId; // Thay socket.userId
    // const userId = socket.userId;
    if (userId) {
      userSocketMap[userId] = socket.id;
      logger.info(`User ${userId} connected with socket ${socket.id}`);
      io.emit("getOnlineUsers", Object.keys(userSocketMap));
      socket.on("getOnlineUsers", () => {
        logger.info(`📥 User ${userId} requested online users`);
        socket.emit("getOnlineUsers", Object.keys(userSocketMap));
      });

    }

    socket.on("disconnect", () => {
      if (userId) {
        delete userSocketMap[userId];
        logger.info(`User ${userId} disconnected`);
        io.emit("getOnlineUsers", Object.keys(userSocketMap));
      }
    });
    logger.info(`Current userSocketMap: ${JSON.stringify(userSocketMap)}`);
  },
  getUserSocketMap() {
    return userSocketMap;
  },
};
