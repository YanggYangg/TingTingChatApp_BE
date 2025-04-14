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
            { userId: "6601a1b2c3d4e5f678901242", role: "member", mute: null, isHidden: false, isPinned: false },
            { userId: "6601a1b2c3d4e5f678901245", role: "member", mute: null, isHidden: false, isPinned: false }, // Thêm người thứ tư
        ],
        lastMessage: null,
        createAt: new Date(),
        updateAt: new Date()
    },
    {
        _id: new mongoose.Types.ObjectId(),
        name: "Chat Cá Nhân A - B",
        isGroup: false,
        participants: [
            { userId: "6601a1b2c3d4e5f678901240", mute: null ,isHidden: false, isPinned: false},
            { userId: "6601a1b2c3d4e5f678901241", mute: null, isHidden: false, isPinned: false },
        ],
        lastMessage: null,
        createAt: new Date(),
        updateAt: new Date()
    },
    {
        _id: new mongoose.Types.ObjectId(),
        name: "Nhóm Dự Án Web Mới",
        isGroup: true,
        linkGroup: "https://groupchat.com/webproject",
        imageGroup: "https://imageurl.com/webgroup.png",
        participants: [
            { userId: "6601a1b2c3d4e5f678901243", role: "admin", mute: null, isHidden: false, isPinned: true },
            { userId: "6601a1b2c3d4e5f678901244", role: "member", mute: null, isHidden: false, isPinned: false },
            { userId: "6601a1b2c3d4e5f678901246", role: "member", mute: null, isHidden: false, isPinned: false },
        ],
        lastMessage: null,
        createAt: new Date(),
        updateAt: new Date()
    },
    {
        _id: new mongoose.Types.ObjectId(),
        name: "Chat Cá Nhân C - D",
        isGroup: false,
        participants: [
            { userId: "6601a1b2c3d4e5f678901247", mute: null ,isHidden: false, isPinned: false},
            { userId: "6601a1b2c3d4e5f678901248", mute: null, isHidden: false, isPinned: false },
        ],
        lastMessage: null,
        createAt: new Date(),
        updateAt: new Date()
    },
    {
        _id: new mongoose.Types.ObjectId(),
        name: "Nhóm Học Lập Trình",
        isGroup: true,
        linkGroup: "https://groupchat.com/learncode",
        imageGroup: "https://imageurl.com/codegroup.png",
        participants: [
            { userId: "6601a1b2c3d4e5f678901249", role: "admin", mute: null, isHidden: false, isPinned: false },
            { userId: "6601a1b2c3d4e5f678901250", role: "member", mute: null, isHidden: false, isPinned: false },
            { userId: "6601a1b2c3d4e5f678901251", role: "member", mute: null, isHidden: false, isPinned: false },
            { userId: "6601a1b2c3d4e5f678901252", role: "member", mute: null, isHidden: false, isPinned: false },
        ],
        lastMessage: null,
        createAt: new Date(),
        updateAt: new Date()
    }
];

const messages = [
    // Tin nhắn cho nhóm Công Nghệ
    {
        conversationId: conversations[0]._id,
        userId: "6601a1b2c3d4e5f678901238",
        content: "Thông báo mới từ admin!",
        messageType: "text",
        linkURL: null,
        status: { sent: true, receivedBy: ["6601a1b2c3d4e5f678901239", "6601a1b2c3d4e5f678901242"], readBy: ["6601a1b2c3d4e5f678901239"] },
        deletedBy: [],
        createdAt: new Date()
    },
    {
        conversationId: conversations[0]._id,
        userId: "6601a1b2c3d4e5f678901239",
        content: "Ý kiến của mọi người về bản cập nhật này thế nào?",
        messageType: "text",
        linkURL: null,
        status: { sent: true, receivedBy: ["6601a1b2c3d4e5f678901238", "6601a1b2c3d4e5f678901242"], readBy: [] },
        deletedBy: [],
        createdAt: new Date()
    },
    {
        conversationId: conversations[0]._id,
        userId: "6601a1b2c3d4e5f678901243",
        content: "Đây là tài liệu chi tiết.",
        messageType: "file",
        linkURL: "https://storetingting.s3.ap-southeast-2.amazonaws.com/new-technology-in-application-development_01.-introduction-to-cloud-computing.pptx",
        status: { sent: true, receivedBy: ["6601a1b2c3d4e5f678901238", "6601a1b2c3d4e5f678901239"], readBy: [] },
        deletedBy: [],
        createdAt: new Date()
    },
    {
        conversationId: conversations[0]._id,
        userId: "6601a1b2c3d4e5f678901245",
        content: "Chào cả nhóm!",
        messageType: "text",
        linkURL: null,
        status: { sent: true, receivedBy: ["6601a1b2c3d4e5f678901238", "6601a1b2c3d4e5f678901239", "6601a1b2c3d4e5f678901242"], readBy: [] },
        deletedBy: [],
        createdAt: new Date()
    },
    {
        conversationId: conversations[0]._id,
        userId: "6601a1b2c3d4e5f678901243",
        content: "Xem video hướng dẫn này nhé: https://videourl.com/tech_guide.mp4",
        messageType: "link",
        linkURL: "https://videourl.com/tech_guide.mp4",
        status: { sent: true, receivedBy: ["6601a1b2c3d4e5f678901239", "6601a1b2c3d4e5f678901242", "6601a1b2c3d4e5f678901245"], readBy: [] },
        deletedBy: [],
        createdAt: new Date()
    },
    {
        conversationId: conversations[0]._id,
        userId: "6601a1b2c3d4e5f678901243",
        content: "Xem video hướng dẫn này nhé: https://videourl.com/tech_guide.mp4",
        messageType: "image",
        linkURL: "https://videourl.com/tech_guide.mp4",
        status: { sent: true, receivedBy: ["6601a1b2c3d4e5f678901239", "6601a1b2c3d4e5f678901242", "6601a1b2c3d4e5f678901245"], readBy: [] },
        deletedBy: [],
        createdAt: new Date()
    },
    {
        conversationId: conversations[0]._id,
        userId: "6601a1b2c3d4e5f678901243",
        content: "Xem video hướng dẫn này nhé: https://videourl.com/tech_guide.mp4",
        messageType: "video",
        linkURL: "https://storetingting.s3.ap-southeast-2.amazonaws.com/2025-03-26+23-42-17.mkv",
        status: { sent: true, receivedBy: ["6601a1b2c3d4e5f678901239", "6601a1b2c3d4e5f678901242", "6601a1b2c3d4e5f678901245"], readBy: [] },
        deletedBy: [],
        createdAt: new Date()
    },
    // Tin nhắn cho Chat Cá Nhân A - B
    {
        conversationId: conversations[1]._id,
        userId: "6601a1b2c3d4e5f678901240",
        content: "Hẹn gặp lại bạn vào ngày mai nhé!",
        messageType: "text",
        linkURL: null,
        status: { sent: true, receivedBy: ["6601a1b2c3d4e5f678901241"], readBy: ["6601a1b2c3d4e5f678901241"] },
        deletedBy: [],
        createdAt: new Date()
    },
    {
        conversationId: conversations[1]._id,
        userId: "6601a1b2c3d4e5f678901241",
        content: "Ok bạn.",
        messageType: "text",
        linkURL: null,
        status: { sent: true, receivedBy: ["6601a1b2c3d4e5f678901240"], readBy: ["6601a1b2c3d4e5f678901240"] },
        deletedBy: [],
        createdAt: new Date()
    },

    // Tin nhắn cho nhóm Dự Án Web Mới
    {
        conversationId: conversations[2]._id,
        userId: "6601a1b2c3d4e5f678901243",
        content: "Chúng ta bắt đầu buổi họp dự án nhé.",
        messageType: "text",
        linkURL: null,
        status: { sent: true, receivedBy: ["6601a1b2c3d4e5f678901244", "6601a1b2c3d4e5f678901246"], readBy: [] },
        deletedBy: [],
        createdAt: new Date()
    },
    {
        conversationId: conversations[2]._id,
        userId: "6601a1b2c3d4e5f678901244",
        content: "Tôi đã sẵn sàng.",
        messageType: "text",
        linkURL: null,
        status: { sent: true, receivedBy: ["6601a1b2c3d4e5f678901243"], readBy: [] },
        deletedBy: [],
        createdAt: new Date()
    },
    {
        conversationId: conversations[2]._id,
        userId: "6601a1b2c3d4e5f678901246",
        content: "Đây là bản thiết kế sơ bộ: https://imageurl.com/web_mockup.png",
        messageType: "link",
        linkURL: "https://imageurl.com/web_mockup.png",
        status: { sent: true, receivedBy: ["6601a1b2c3d4e5f678901243", "6601a1b2c3d4e5f678901244"], readBy: [] },
        deletedBy: [],
        createdAt: new Date()
    },

    // Tin nhắn cho Chat Cá Nhân C - D
    {
        conversationId: conversations[3]._id,
        userId: "6601a1b2c3d4e5f678901247",
        content: "Bạn có khỏe không?",
        messageType: "text",
        linkURL: null,
        status: { sent: true, receivedBy: ["6601a1b2c3d4e5f678901248"], readBy: [] },
        deletedBy: [],
        createdAt: new Date()
    },
    {
        conversationId: conversations[3]._id,
        userId: "6601a1b2c3d4e5f678901248",
        content: "Mình vẫn ổn, cảm ơn bạn.",
        messageType: "text",
        linkURL: null,
        status: { sent: true, receivedBy: ["6601a1b2c3d4e5f678901247"], readBy: [] },
        deletedBy: [],
        createdAt: new Date()
    },

    // Tin nhắn cho nhóm Học Lập Trình
    {
        conversationId: conversations[4]._id,
        userId: "6601a1b2c3d4e5f678901249",
        content: "Chào mừng các thành viên mới!",
        messageType: "text",
        linkURL: null,
        status: { sent: true, receivedBy: ["6601a1b2c3d4e5f678901250", "6601a1b2c3d4e5f678901251", "6601a1b2c3d4e5f678901252"], readBy: [] },
        deletedBy: [],
        createdAt: new Date()
    },
    {
        conversationId: conversations[4]._id,
        userId: "6601a1b2c3d4e5f678901250",
        content: "Mình là người mới, rất vui được làm quen.",
        messageType: "text",
        linkURL: null,
        status: { sent: true, receivedBy: ["6601a1b2c3d4e5f678901249"], readBy: [] },
        deletedBy: [],
        createdAt: new Date()
    },
    {
        conversationId: conversations[4]._id,
        userId: "6601a1b2c3d4e5f678901251",
        content: "Có ai biết về React Native không ạ?",
        messageType: "text",
        linkURL: null,
        status: { sent: true, receivedBy: ["6601a1b2c3d4e5f678901249", "6601a1b2c3d4e5f678901250", "6601a1b2c3d4e5f678901252"], readBy: [] },
        deletedBy: [],
        createdAt: new Date()
    },
    {
        conversationId: conversations[4]._id,
        userId: "6601a1b2c3d4e5f678901249",
        content: "Đây là link tài liệu React Native cơ bản: https://docs.com/react-native",
        messageType: "link",
        linkURL: "https://docs.com/react-native",
        status: { sent: true, receivedBy: ["6601a1b2c3d4e5f678901250", "6601a1b2c3d4e5f678901251", "6601a1b2c3d4e5f678901252"], readBy: [] },
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