// const cors = require("cors");
// const express = require("express");
// const http = require("http");
// const socketio = require("socket.io");
// const messageRoutes = require("./routes/messageRoutes");
// const fileRoutes = require("./routes/fileRoutes");
// require("dotenv").config();

// const app = express();
// const server = http.createServer(app); // Tạo HTTP server
// const io = socketio(server, {
//   cors: {
//     origin: "*", // Cho phép tất cả các origin (có thể chỉnh lại nếu cần)
//   },
// });

// // Lưu socket.io vào app để dùng trong controller
// app.set("socketio", io);

// // Middleware
// app.use(cors());
// app.use(express.json());

// // Routes
// app.use("/api/messages", messageRoutes);
// app.use("/api/files", fileRoutes);

// // Sự kiện socket
// io.on("connection", (socket) => {
//   console.log("🔌 Client connected:", socket.id);

//   socket.on("disconnect", () => {
//     console.log("❌ Client disconnected:", socket.id);
//   });
// });

// const PORT = process.env.PORT || 3000;
// server.listen(PORT, () => {
//   console.log(`🚀 Server đang chạy trên cổng ${PORT}`);
// });

// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    // origin: "http://localhost:5173", // Đảm bảo khớp với port của client (React app của bạn chạy trên port 5173)
    origin : '*',
    methods: ["GET", "POST"],
  },
});

// Lưu socket.io vào app
app.set('socketio', io);

app.use(cors());

// Xử lý kết nối Socket.IO
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id, 'with userId:', socket.handshake.query.userId);

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
  });
});

// Middleware và routes
app.use(express.json());
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/files', require('./routes/fileRoutes'));

// Khởi động server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});