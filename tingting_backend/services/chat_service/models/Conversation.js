const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({

    name: {
        type: String,
    },
    isGroup: {
        type: Boolean,
        required: true, // true: group, false: private
    },
    linkGroup: {
        type: String, // Link nhóm
    },
    imageGroup: {
        type: String, // Link ảnh nhóm
    },
    participants: [
        {
            // userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
            userId: { type: String, required: true },
            role: { type: String }, // chỉ có khi isGroup = true
        },
    ],
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
    },
    mute: {
        type: String,
        enum: ['1h', '4h', '8am', 'forever', null], // Cho phép giá trị null khi không tắt thông báo
        default: null,
    },
    createAt: {
        type: Date,
        default: Date.now,
    },
    updateAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports =
    mongoose.models.Conversation || mongoose.model('Conversation', conversationSchema);