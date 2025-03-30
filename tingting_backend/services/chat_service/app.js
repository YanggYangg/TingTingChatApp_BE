const express = require('express');
const cors = require('cors');
const connectDB = require('./configs/db');
require('dotenv').config();
const conversationRoutes = require('./routes/conversationRoutes');
const messageRoutes = require('./routes/messageRoutes');



const app = express();
app.use(cors());
app.use(express.json());

// app.use(cors({
//   origin: (origin, callback) => {
//     callback(null, true); // Cho phép tất cả các nguồn
//   },
//   // credentials: true 
// }));
app.options('*', cors()); // Cho phép tất cả các yêu cầu OPTIONS

app.use('/conversations', conversationRoutes);
app.use('/messages', messageRoutes);
connectDB();

app.get("/", (req, res) => {
    res.send("Chat Service is running.....");
});

module.exports = app;