const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Conversation = require('./models/Conversation');
const Message = require('./models/Message');
dotenv.config();

const conversations = [
    {
        avatar: "https://example.com/avatar1.jpg",
        name: "Nhóm Lập Trình",
        isGroup: true,
        participants: [
            { userId: "6601a1b2c3d4e5f678901234", role: "admin" },
            { userId: "6601a1b2c3d4e5f678901235", role: "member" }
        ],
        lastMessage: "6602b2c3d4e5f67890123678",
        createAt: new Date(),
        updateAt: new Date()
    },
    {
        avatar: "https://example.com/avatar2.jpg",
        name: "",
        isGroup: false,
        participants: [
            { userId: "6601a1b2c3d4e5f678901236" },
            { userId: "6601a1b2c3d4e5f678901237" }
        ],
        lastMessage: "6602b2c3d4e5f67890123679",
        createAt: new Date(),
        updateAt: new Date()
    }
];

const messages = [
    {
        conversationId: new mongoose.Types.ObjectId(),
        sender: [
            {
                userId: "user123",
                content: "Xin chào!",
                messageType: "text",
                status: "sent",
                time: new Date()
            }
        ],
        createdAt: new Date()
    },
    {
        conversationId: new mongoose.Types.ObjectId(),
        sender: [
            {
                userId: "user456",
                content: "file123.pdf",
                messageType: "file",
                status: "received",
                time: new Date()
            }
        ],
        createdAt: new Date()
    }
];


mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(async () => {
        console.log("Kết nối MongoDB thành công!");
        // await Conversation.deleteMany();
        // await Conversation.insertMany(conversations);
        await Message.insertMany(messages);
        console.log("Dữ liệu đã được thêm thành công!");

        mongoose.connection.close();
    })
    .catch(err => console.error("Lỗi kết nối MongoDB:", err));
