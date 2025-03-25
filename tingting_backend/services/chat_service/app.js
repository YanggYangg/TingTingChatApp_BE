const express = require('express');
const cors = require('cors');
const connectDB = require('./configs/db');
require('dotenv').config();
const conversationRoutes = require('./routes/conversationRoutes');
const messageRoutes = require('./routes/messageRoutes');



const app = express();
// app.use(cors());
app.use(express.json());

app.use(cors({ 
    origin: "http://localhost:5174", // Chỉ cho phép frontend truy cập
    credentials: true // Nếu frontend gửi cookie/token, cần bật credentials
  }));
  

app.use('/conversations', conversationRoutes);
app.use('/messages', messageRoutes);
connectDB();

app.get("/", (req, res) => {
    res.send("Chat Service is running.....");
});

module.exports = app;