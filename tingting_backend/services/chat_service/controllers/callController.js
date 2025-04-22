const Call = require("../models/Call");
const { getIO } = require("../services/socket");

module.exports = {
  initiateCall: async (req, res) => {
    try {
      const { conversationId, callerId, receiverId, callType } = req.body;

      if (!conversationId || !callerId || !receiverId || !callType) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const call = new Call({
        conversationId,
        callerId,
        receiverId,
        callType,
        status: "initiated",
      });
      await call.save();

      // Gửi tín hiệu qua Socket.IO
      const io = getIO();
      io.to(conversationId).emit("initiateCall", {
        callId: call._id,
        callerId,
        receiverId,
        conversationId,
        callType,
      });

      res.status(201).json({ callId: call._id, message: "Call initiated" });
    } catch (error) {
      console.error("Error initiating call:", error);
      res.status(500).json({ message: "Error initiating call" });
    }
  },
};
