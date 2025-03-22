const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversations',
        required: true,
        index: true  // Tạo index để truy vấn theo conversation nhanh hơn
    },
    message: {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true  // Tạo index để tìm tin nhắn theo người dùng nhanh hơn
        },
        content: {
            type: String,
            required: true
        },
        messageType: {
            type: String,
            enum: ['text', 'image', 'file', 'video'],
            required: true
        },
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
        }
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true  // Tạo index để sắp xếp tin nhắn theo thời gian nhanh hơn
    }
});

// Tạo index tổng hợp cho truy vấn hiệu suất cao
messageSchema.index({ conversationId: 1, 'message.userId': 1, createdAt: -1 });

module.exports = mongoose.models.Message || mongoose.model('Message', messageSchema);
