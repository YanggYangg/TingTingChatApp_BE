const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Message = require('./models/Message');
const Conversation = require('./models/Conversation');
dotenv.config();

// Tạo 2 conversationId khác nhau
const conversationId1 = new mongoose.Types.ObjectId(); // Cuộc trò chuyện có nhiều tin nhắn
const conversationId2 = new mongoose.Types.ObjectId(); // Cuộc trò chuyện có ít tin nhắn

const messages = [
    // Tin nhắn thuộc cuộc trò chuyện 1 (nhiều tin nhắn)
    {
        conversationId: conversationId1,
        message: {
            userId: new mongoose.Types.ObjectId("65ffabcd9876def012345678"),
            content: "Xin chào mọi người!",
            messageType: "text",
            linkURL: "",
            status: {
                sent: true,
                receivedBy: [new mongoose.Types.ObjectId("6601a1b2c3d4e5f678901234")],
                readBy: [new mongoose.Types.ObjectId("6601a1b2c3d4e5f678901234")]
            }
        },
        createdAt: new Date()
    },
    {
        conversationId: conversationId1,
        message: {
            userId: new mongoose.Types.ObjectId("6601a1b2c3d4e5f678901235"),
            content: "file123.pdf",
            messageType: "file",
            linkURL: "https://example.com/file123.pdf",
            status: {
                sent: true,
                receivedBy: [new mongoose.Types.ObjectId("6601a1b2c3d4e5f678901236")],
                readBy: []
            }
        },
        createdAt: new Date()
    },
    {
        conversationId: conversationId1,
        message: {
            userId: new mongoose.Types.ObjectId("6601a1b2c3d4e5f678901236"),
            content: "https://example.com/image123.jpg",
            messageType: "image",
            linkURL: "https://example.com/image123.jpg",
            status: {
                sent: true,
                receivedBy: [new mongoose.Types.ObjectId("6601a1b2c3d4e5f678901237")],
                readBy: []
            }
        },
        createdAt: new Date()
    },
    {
        conversationId: conversationId1,
        message: {
            userId: new mongoose.Types.ObjectId("6601a1b2c3d4e5f678901237"),
            content: "https://example.com/video123.mp4",
            messageType: "link",
            linkURL: "https://example.com",
            status: {
                sent: true,
                receivedBy: [new mongoose.Types.ObjectId("6601a1b2c3d4e5f678901238")],
                readBy: []
            }
        },
        createdAt: new Date()
    },

    // Tin nhắn thuộc cuộc trò chuyện 2 (ít tin nhắn)
    {
        conversationId: conversationId2,
        message: {
            userId: new mongoose.Types.ObjectId("6601a1b2c3d4e5f678901238"),
            content: "Chào bạn!",
            messageType: "text",
            linkURL: "",
            status: {
                sent: true,
                receivedBy: [new mongoose.Types.ObjectId("6601a1b2c3d4e5f678901239")],
                readBy: []
            }
        },
        createdAt: new Date()
    },
    {
        conversationId: conversationId2,
        message: {
            userId: new mongoose.Types.ObjectId("6601a1b2c3d4e5f678901239"),
            content: "fileABC.docx",
            messageType: "file",
            linkURL: "https://example.com/fileABC.docx",
            status: {
                sent: true,
                receivedBy: [new mongoose.Types.ObjectId("6601a1b2c3d4e5f678901240")],
                readBy: []
            }
        },
        createdAt: new Date()
    }
];

const conversations = [
    {
        _id: conversationId1,
        avatar: "https://example.com/avatar1.jpg",
        name: "Nhóm Lập Trình",
        isGroup: true,
        participants: [
            { userId: "6601a1b2c3d4e5f678901234", role: "admin" },
            { userId: "6601a1b2c3d4e5f678901235", role: "member" },
            { userId: "6601a1b2c3d4e5f678901236", role: "member" }
        ],
        lastMessage: "6602b2c3d4e5f67890123678",
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        _id: conversationId2,
        avatar: "https://example.com/avatar2.jpg",
        name: "Chat với Người Lạ",
        isGroup: false,
        participants: [
            { userId: "6601a1b2c3d4e5f678901238" },
            { userId: "6601a1b2c3d4e5f678901239" }
        ],
        lastMessage: "6602b2c3d4e5f67890123679",
        createdAt: new Date(),
        updatedAt: new Date()
    }
];

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(async () => {
        console.log("✅ Kết nối MongoDB thành công!");
        await Conversation.insertMany(conversations);
        await Message.insertMany(messages);
        console.log("✅ Dữ liệu tin nhắn đã được thêm thành công!");
        mongoose.connection.close();
    })
    .catch(err => console.error("❌ Lỗi kết nối MongoDB:", err));
