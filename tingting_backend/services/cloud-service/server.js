const cors = require("cors");
const express = require("express");
const messageRoutes = require("./routes/messageRoutes");
const fileRoutes = require("./routes/fileRoutes");
require("dotenv").config();

const app = express();
app.use(express.json());

// Đặt cors trước các route
app.use(cors()); // Cho phép tất cả origin

// Route
app.use("/api/messages", messageRoutes);
app.use("/api/files", fileRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server đang chạy trên cổng ${PORT}`);
});
