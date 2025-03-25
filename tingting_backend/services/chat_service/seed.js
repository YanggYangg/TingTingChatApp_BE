const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Message = require('./models/Message');
const Conversation = require('./models/Conversation');
dotenv.config();

const messages = [
    {
        conversationId: new mongoose.Types.ObjectId(),

        userId: new mongoose.Types.ObjectId("65ffabcd9876def012345678"), // Chuyển userId sang ObjectId
        content: "Xin chào!",
        messageType: "text",
        linkURL: "",
        status: {
            sent: true,
            receivedBy: [new mongoose.Types.ObjectId("6601a1b2c3d4e5f678901234")],
            readBy: [new mongoose.Types.ObjectId("6601a1b2c3d4e5f678901234")]
        },

        createdAt: new Date()
    },
    {
        conversationId: new mongoose.Types.ObjectId(),

        userId: new mongoose.Types.ObjectId("6601a1b2c3d4e5f678901235"),
        content: "file123.pdf",
        messageType: "file",
        linkURL: "https://example.com/file123.pdf",
        status: {
            sent: true,
            receivedBy: [new mongoose.Types.ObjectId("6601a1b2c3d4e5f678901236")],
            readBy: []
        },
        createdAt: new Date()
    }
];
const conversations = [
    {

        name: "Nhóm Lập Trình",
        isGroup: true,
        linkGroup: "https://example.com/group",
        imageGroup: "https://example.com/group.jpg",
        participants: [
            { userId: "6601a1b2c3d4e5f678901234", role: "admin" },
            { userId: "6601a1b2c3d4e5f678901235", role: "member" }
        ],
        lastMessage: "6602b2c3d4e5f67890123678",
        createAt: new Date(),
        updateAt: new Date()
    },
    {

        name: "",
        isGroup: false,
        linkGroup: "https://example.com/group",
        imageGroup: "https://example.com/group.jpg",
        participants: [
            { userId: "6601a1b2c3d4e5f678901236" },
            { userId: "6601a1b2c3d4e5f678901237" }
        ],
        lastMessage: "6602b2c3d4e5f67890123679",
        createAt: new Date(),
        updateAt: new Date()
    }
];

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(async () => {
        console.log("✅ Kết nối MongoDB thành công!");
        //   await Conversation.insertMany(conversations);
        await Message.insertMany(messages);
        console.log("✅ Dữ liệu tin nhắn đã được thêm thành công!");

        mongoose.connection.close();
    })
    .catch(err => console.error("❌ Lỗi kết nối MongoDB:", err));