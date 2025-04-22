const express = require("express");
const cors = require("cors");
const http = require("http");
const { initializeSocket } = require("./services/socket/index");
const connectDB = require("./configs/db");
require("dotenv").config();
const conversationRoutes = require("./routes/conversationRoutes");
const messageRoutes = require("./routes/messageRoutes");
const chatRoutes = require("./routes/chatRoutes");
const callRoutes = require("./routes/callRoutes");

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
initializeSocket(server);

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
    ],
    credentials: true,
  })
);
app.use(express.json());

app.use("/conversations", conversationRoutes);
app.use("/messages", messageRoutes);
app.use("/chats", chatRoutes);
app.use("/calls", callRoutes);
connectDB();

app.get("/", (req, res) => {
  res.send("Chat Service is running.....");
});

module.exports = { app, server };
