const Call = require("../../../models/Call");
const logger = require("../../../utils/logger");
const errorHandler = require("../../../utils/errorHandler");
const socketService = require("../socketService");

module.exports = {
  // Handle initiating a call
  async handleInitiateCall(
    socket,
    { conversationId, callerId, receiverId, callType, offer },
    io
  ) {
    if (!conversationId || !callerId || !receiverId || !callType || !offer) {
      return errorHandler(socket, "Invalid call initiation data");
    }

    try {
      // Create a new call record
      const call = new Call({
        conversationId,
        callerId,
        receiverId,
        callType,
        status: "initiated",
      });
      await call.save();
      logger.info(`Call initiated: ${call._id} by user ${callerId}`);

      // Check if receiver is online
      const callData = {
        callId: call._id,
        conversationId,
        callerId,
        receiverId,
        callType,
        offer,
      };

      const receiverSocketId = socketService.getReceiverSocketId(receiverId);
      if (!receiverSocketId) {
        logger.warn(`Receiver ${receiverId} is offline`);
        call.status = "missed";
        await call.save();
        socket.emit("callStatus", { callId: call._id, status: "missed" });
        return;
      }

      // Luôn gửi incomingCall, không cần kiểm tra online
      call.status = "ringing";
      await call.save();

      const ongoingCalls = new Set();
      if (ongoingCalls.has(callerId)) {
        return errorHandler(socket, "You are already in a call");
      }
      ongoingCalls.add(callerId);
      // Xóa khi cuộc gọi kết thúc
      socket.on("endCall", () => {
        ongoingCalls.delete(callerId);
      });

      socketService.emitToUser(receiverId, "incomingCall", callData);
      socket.emit("callStatus", { callId: call._id, status: "ringing" });
      logger.info(`(No check) Emitted incomingCall to receiver ${receiverId}`);
    } catch (error) {
      errorHandler(socket, "Failed to initiate call", error);
    }
  },

  // Handle answering a call
  async handleAnswerCall(socket, { callId, answer }, userId, io) {
    if (!callId || !answer || !userId) {
      return errorHandler(socket, "Invalid call answer data");
    }

    try {
      const call = await Call.findById(callId);
      if (!call) {
        return errorHandler(socket, "Call not found");
      }

      if (call.receiverId.toString() !== userId) {
        return errorHandler(socket, "Unauthorized to answer this call");
      }

      call.status = "answered";
      await call.save();
      logger.info(`Call ${callId} answered by user ${userId}`);

      // Emit 'callAnswered' to the caller
      socketService.emitToUser(call.callerId, "callAnswered", {
        callId,
        answer,
      });
      socket.emit("callStatus", { callId, status: "answered" });
    } catch (error) {
      errorHandler(socket, "Failed to answer call", error);
    }
  },

  // Handle ending or rejecting a call
  async handleEndCall(socket, { callId, reason }, userId, io) {
    if (!callId || !reason) {
      return errorHandler(socket, "Invalid call end data");
    }

    try {
      const call = await Call.findById(callId);
      if (!call) {
        return errorHandler(socket, "Call not found");
      }

      const status = reason === "rejected" ? "rejected" : "ended";
      call.status = status;
      call.endedAt = new Date();
      await call.save();
      logger.info(`Call ${callId} ${status} by user ${userId}`);

      // Emit 'callEnded' to both caller and receiver
      socketService.emitToUser(call.callerId, "callEnded", { callId, status });
      socketService.emitToUser(call.receiverId, "callEnded", {
        callId,
        status,
      });
      socket.emit("callStatus", { callId, status });
    } catch (error) {
      errorHandler(socket, "Failed to end call", error);
    }
  },

  // Handle ICE candidate exchange for WebRTC
  handleIceCandidate(socket, { callId, candidate, toUserId }, userId) {
    if (!callId || !candidate || !toUserId) {
      return errorHandler(socket, "Invalid ICE candidate data");
    }

    try {
      socketService.emitToUser(toUserId, "iceCandidate", { callId, candidate });
      logger.info(`ICE candidate sent from ${userId} to ${toUserId}`);
    } catch (error) {
      errorHandler(socket, "Failed to send ICE candidate", error);
    }
  },
};
