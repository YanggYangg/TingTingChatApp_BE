const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
    userId:{
        // type: mongoose.Schema.Types.ObjectId,
        // ref: "User",
        // required: true,
        type: String,
        required: true
    },
    conversationId:{
        // type: mongoose.Schema.Types.ObjectId,
        // ref: "Conversation",
        // required: false,
        type: String,
        required: false
    },
    messageId: {
        // type: mongoose.Schema.Types.ObjectId,
        // ref: "Messages",
        // required: false, // Không bắt buộc, vì có thể là lời mời nhóm
        type: String,
        required: false
    },
    typeNotice: {
        type: String,
        enum: ["new_message", "new_friend_request"],
        required: true,
    },
    content: {
        type: String,
        required: true,
      },
      isRead: {
        type: Boolean,
        default: false,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
      updatedAt: {
        type: Date,
        default: Date.now,
      }
},
);

module.exports = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);