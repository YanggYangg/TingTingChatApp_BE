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
const chatgptRoutes = require("./routes/chatgptRoutes");

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
initializeSocket(server);

app.use(cors({
    //origin: ['http://localhost:5173', 'http://localhost:8081'],
    origin : "*",
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    credentials: true
}));
app.use(express.json());

app.use("/conversations", conversationRoutes);
app.use("/messages", messageRoutes);
app.use("/chats", chatRoutes);
app.use("/calls", callRoutes);
app.use("/", chatgptRoutes);

app.use("/api/conversations", callRoutes);
connectDB();

app.get("/", (req, res) => {
  res.send("Chat Service is running.....");
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server/service running on port ${PORT} .....`);
});

module.exports = { app, server };
