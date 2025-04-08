const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Conversation = require('./models/Conversation'); 
const Message = require('./models/Message'); 
dotenv.config();

const conversations = [
    {
        _id: new mongoose.Types.ObjectId(),
        name: "Nhóm Công Nghệ",
        isGroup: true,
        linkGroup: "https://groupchat.com/tech",
        imageGroup: "https://imageurl.com/techgroup.png",
        participants: [
            { userId: "6601a1b2c3d4e5f678901238", role: "admin" },
            { userId: "6601a1b2c3d4e5f678901239", role: "member" }
        ],
        lastMessage: null,
        createAt: new Date(),
        updateAt: new Date()
    },
    {
        _id: new mongoose.Types.ObjectId(),
        name: "Chat Cá Nhân",
        isGroup: false,
        participants: [
            { userId: "6601a1b2c3d4e5f678901240" },
            { userId: "6601a1b2c3d4e5f678901241" }
        ],
        lastMessage: null,
        createAt: new Date(),
        updateAt: new Date()
    }
];

const messages = [
    {
        conversationId: conversations[0]._id,
        userId: "6601a1b2c3d4e5f678901238",
        content: "Chào mừng mọi người!",
        messageType: "text",
        linkURL: null,
        status: { sent: true, receivedBy: [], readBy: [] },
        createdAt: new Date()
    },
    {
        conversationId: conversations[1]._id,
        userId: "6601a1b2c3d4e5f678901240",
        content: "Hôm nay bạn thế nào?",
        messageType: "text",
        linkURL: null,
        status: { sent: true, receivedBy: [], readBy: [] },
        createdAt: new Date()
    }
];

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(async () => {
    console.log("Kết nối MongoDB thành công!");
    await Conversation.deleteMany();
    await Message.deleteMany();
    await Conversation.insertMany(conversations);
    await Message.insertMany(messages);
    console.log("Dữ liệu đã được thêm thành công!");
    mongoose.connection.close();
})
.catch(err => console.error("Lỗi kết nối MongoDB:", err));
