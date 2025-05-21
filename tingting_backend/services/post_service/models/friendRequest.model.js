// models/FriendRequest.js
import mongoose from "mongoose";

const friendRequestSchema = new mongoose.Schema({
  requester: {//nguoi gui yeu cau ket ban
    type: mongoose.Schema.Types.ObjectId,
    ref: "Profiles",
    required: true,
  },
  recipient: {//nguoi nhan yeu cau ket ban
    type: mongoose.Schema.Types.ObjectId,
    ref: "Profiles",
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending",
  },
}, { timestamps: true });
const FriendRequest = mongoose.model("FriendRequest", friendRequestSchema);
export default FriendRequest;
