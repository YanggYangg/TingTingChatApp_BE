const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Notification = require('./models/Notification');
dotenv.config();

const notifications = [
    {
      userId: "65fc4d27a3174d001f4c4a21",
      conversationId: "65fc4d27a3174d001f4c4a30",
      messageId: "65fc4d27a3174d001f4c4a40",
      typeNotice: "new_message",
      content: "Bạn có tin nhắn mới từ Alice!",
      isRead: false,
    },
    {
      userId: "65fc4d27a3174d001f4c4a22",
      conversationId: "65fc4d27a3174d001f4c4a31",
      messageId: "65fc4d27a3174d001f4c4a41",
      typeNotice: "new_message",
      content: "Bob đã gửi tin nhắn cho bạn!",
      isRead: false,
    },
    {
      userId: "65fc4d27a3174d001f4c4a23",
      typeNotice: "group_invite",
      content: "Bạn được mời vào nhóm 'Lập trình NodeJS'!",
      isRead: false,
    },
  ];

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(async () => {
    console.log("Kết nối MongoDB thành công!");
    await Notification.insertMany(notifications);
    console.log("Dữ liệu đã được thêm thành công!");

    mongoose.connection.close();
})
.catch(err => console.error("Lỗi kết nối MongoDB:", err));
