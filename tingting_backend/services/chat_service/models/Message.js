const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversations',
        required: true,
        index: true // Tạo index để truy vấn theo conversation nhanh hơn
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true // Tạo index để tìm tin nhắn theo người dùng nhanh hơn
    },
    content: {
        type: String,
        required: true
    },
    messageType: {
        type: String,
        enum: ['text', 'image', 'file', 'video', 'audio', 'reply', 'emoji', 'sticker', 'location', 'link'],
        required: true
    },
    // nếu là reply thì link tới tin nhắn gốc
    replyMessageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
        default: null
    },
    isRevoked:{
        type: Boolean,
        default: false
    },
    deleteBt:[{
        type: mongoose.Schema.Types.ObjectId, //userId đã xóa tin nhắn này
        ref: 'User'
    }],
    linkURL: {
        type: String,
        default: null
    },
    status: {
        sent: {
            type: Boolean,
            default: true
        },
        receivedBy: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        readBy: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }]
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true // Tạo index để sắp xếp tin nhắn theo thời gian nhanh hơn
    }
});

// Tạo index tổng hợp cho truy vấn hiệu suất cao
messageSchema.index({ conversationId: 1, userId: 1, createdAt: -1 });

module.exports = mongoose.models.Message || mongoose.model('Message', messageSchema);
