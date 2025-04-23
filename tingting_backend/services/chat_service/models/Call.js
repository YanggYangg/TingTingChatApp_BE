const mongoose = require("mongoose");

const callSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    callerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    callType: {
      type: String,
      enum: ["voice", "video"],
      required: true,
    },
    status: {
      type: String,
      enum: ["initiated", "ringing", "answered", "rejected", "ended", "missed"],
      default: "initiated",
    },
    duration: {
      type: Number, // Duration in seconds
      default: 0,
    },
    startedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    endedAt: {
      type: Date,
    },
    duration: {
      type: Number, // Thời gian cuộc gọi tính bằng giây
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Call || mongoose.model("Call", callSchema);
