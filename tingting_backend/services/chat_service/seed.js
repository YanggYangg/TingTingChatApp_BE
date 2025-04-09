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
            {
                userId: "6601a1b2c3d4e5f678901238", role: "admin", mute: "1h", isHidden: false, isPinned: false
            },
            { userId: "6601a1b2c3d4e5f678901239", role: "member", mute: null, isHidden: false, isPinned: false },
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
            { userId: "6601a1b2c3d4e5f678901240", mute: null ,isHidden: false, isPinned: false},
            { userId: "6601a1b2c3d4e5f678901241", mute: null, isHidden: false, isPinned: false },
        ],
        lastMessage: null,
        createAt: new Date(),
        updateAt: new Date()
    }
];

const messages = [
    // Tin nhắn văn bản
    {
        conversationId: conversations[0]._id,
        userId: "6601a1b2c3d4e5f678901238",
        content: "Chào mừng mọi người!",
        messageType: "text",
        linkURL: null,
        status: { sent: true, receivedBy: [], readBy: [] },
        deletedBy: [],
        createdAt: new Date()
    },
    // Tin nhắn hình ảnh
    {
        conversationId: conversations[0]._id,
        userId: "6601a1b2c3d4e5f678901239",
        content: "Check ảnh này nhé!",
        messageType: "image",
        linkURL: "https://imageurl.com/photo.jpg",
        status: { sent: true, receivedBy: [], readBy: [] },
        deletedBy: [],
        createdAt: new Date()
    },
    // Tin nhắn file
    {
        conversationId: conversations[0]._id,
        userId: "6601a1b2c3d4e5f678901238",
        content: "Đây là tài liệu hướng dẫn.",
        messageType: "file",
        linkURL: "https://fileurl.com/document.pdf",
        status: { sent: true, receivedBy: [], readBy: [] },
        deletedBy: [],
        createdAt: new Date()
    },
    // Tin nhắn video
    {
        conversationId: conversations[0]._id,
        userId: "6601a1b2c3d4e5f678901239",
        content: "Xem video này đi!",
        messageType: "video",
        linkURL: "https://videourl.com/demo.mp4",
        status: { sent: true, receivedBy: [], readBy: [] },
        deletedBy: [],
        createdAt: new Date()
    },
    // Tin nhắn link
    {
        conversationId: conversations[0]._id,
        userId: "6601a1b2c3d4e5f678901238",
        content: "Bài viết này rất hay.",
        messageType: "link",
        linkURL: "https://blog.com/article",
        status: { sent: true, receivedBy: [], readBy: [] },
        deletedBy: [],
        createdAt: new Date()
    },

    // Tin nhắn cho cuộc trò chuyện cá nhân
    {
        conversationId: conversations[1]._id,
        userId: "6601a1b2c3d4e5f678901240",
        content: "Hôm nay bạn thế nào?",
        messageType: "text",
        linkURL: null,
        status: { sent: true, receivedBy: [], readBy: [] },
        deletedBy: [],
        createdAt: new Date()
    },
    {
        conversationId: conversations[1]._id,
        userId: "6601a1b2c3d4e5f678901241",
        content: "Mình khỏe, còn bạn?",
        messageType: "text",
        linkURL: null,
        status: { sent: true, receivedBy: [], readBy: [] },
        deletedBy: [],
        createdAt: new Date()
    },
    {
        conversationId: conversations[1]._id,
        userId: "6601a1b2c3d4e5f678901240",
        content: "Nhìn ảnh này đi!",
        messageType: "image",
        linkURL: "https://imageurl.com/funny.jpg",
        status: { sent: true, receivedBy: [], readBy: [] },
        deletedBy: [],
        createdAt: new Date()
    },
    {
        conversationId: conversations[1]._id,
        userId: "6601a1b2c3d4e5f678901241",
        content: "Đây là bài nhạc mới của mình.",
        messageType: "video",
        linkURL: "https://musicurl.com/song.mp4",
        status: { sent: true, receivedBy: [], readBy: [] },
        deletedBy: [],
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