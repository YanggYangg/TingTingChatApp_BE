const Call = require("../../../models/Call");
const Conversation = require("../../../models/Conversation");
const Message = require("../../../models/Message");
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
      logger.error(`[CallHandler] Invalid call initiation data:`, {
        conversationId,
        callerId,
        receiverId,
        callType,
        offer,
      });
      return errorHandler(socket, "Invalid call initiation data");
    }

    try {
      const call = new Call({
        conversationId,
        callerId,
        receiverId,
        callType,
        status: "initiated",
      });
      await call.save();
      logger.info(
        `[CallHandler] Call initiated: ${call._id} by user ${callerId}`
      );

      // Thêm callId vào mảng calls của Conversation
      await Conversation.updateOne(
        { _id: conversationId },
        { $push: { calls: call._id }, updateAt: new Date() }
      );
      logger.info(
        `[CallHandler] Added call ${call._id} to conversation ${conversationId}`
      );

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
        logger.warn(`[CallHandler] Receiver ${receiverId} is offline`);
        call.status = "missed";
        await call.save();
        socket.emit("callStatus", { callId: call._id, status: "missed" });
        return;
      }

      call.status = "ringing";
      await call.save();

      const ongoingCalls = new Set();
      if (ongoingCalls.has(callerId)) {
        logger.warn(`[CallHandler] User ${callerId} is already in a call`);
        return errorHandler(socket, "You are already in a call");
      }
      ongoingCalls.add(callerId);
      socket.on("endCall", () => {
        ongoingCalls.delete(callerId);
      });

      socketService.emitToUser(receiverId, "incomingCall", callData);
      socket.emit("callStatus", { callId: call._id, status: "ringing" });
      logger.info(
        `[CallHandler] Emitted incomingCall to receiver ${receiverId} with callId ${call._id}, callType: ${callType}`
      );
    } catch (error) {
      logger.error(`[CallHandler] Failed to initiate call:`, error);
      errorHandler(socket, "Failed to initiate call", error);
    }
  },

  // Handle answering a call
  async handleAnswerCall(socket, { callId, answer }, userId, io) {
    if (!callId || !answer || !userId) {
      logger.error(`[CallHandler] Invalid call answer data:`, {
        callId,
        answer,
        userId,
      });
      return errorHandler(socket, "Invalid call answer data");
    }

    try {
      const call = await Call.findById(callId);
      if (!call) {
        logger.warn(`[CallHandler] Call not found: ${callId}`);
        return errorHandler(socket, "Call not found");
      }

      if (call.receiverId.toString() !== userId) {
        logger.warn(
          `[CallHandler] Unauthorized to answer call ${callId} by user ${userId}`
        );
        return errorHandler(socket, "Unauthorized to answer this call");
      }

      call.status = "answered";
      call.startedAt = new Date();
      logger.info(
        `[CallHandler] Call ${callId} answered by user ${userId} at ${call.startedAt}`
      );
      await call.save();
      const savedCall = await Call.findById(callId);
      logger.info(
        `[CallHandler] Saved call ${callId} with startedAt: ${savedCall.startedAt}`
      );

      socketService.emitToUser(call.callerId, "callAnswered", {
        callId,
        answer,
      });
      socket.emit("callStatus", { callId, status: "answered" });
    } catch (error) {
      logger.error(`[CallHandler] Failed to answer call:`, error);
      errorHandler(socket, "Failed to answer call", error);
    }
  },

  // Handle ending or rejecting a call
  async handleEndCall(socket, { callId, reason }, userId, io) {
    if (!callId || !reason) {
      logger.error(`[CallHandler] Invalid call end data:`, {
        callId,
        reason,
        userId,
      });
      return errorHandler(socket, "Invalid call end data");
    }

    try {
      const call = await Call.findById(callId).populate("conversationId");
      if (!call) {
        logger.warn(`[CallHandler] Call not found: ${callId}`);
        return errorHandler(socket, "Call not found");
      }

      const status =
        reason === "rejected"
          ? "rejected"
          : reason === "media_error"
          ? "failed"
          : "ended";
      call.status = status;
      call.endedAt = new Date();

      // Tính duration nếu có startedAt và endedAt
      if (call.startedAt && call.endedAt) {
        call.duration = Math.floor((call.endedAt - call.startedAt) / 1000);
        logger.info(
          `[CallHandler] Calculated duration for call ${callId}: ${call.duration} seconds`
        );
      } else {
        call.duration = 0;
        logger.warn(
          `[CallHandler] Duration not calculated for call ${callId}. startedAt: ${call.startedAt}, endedAt: ${call.endedAt}`
        );
      }

      await call.save();
      logger.info(
        `[CallHandler] Call ${callId} ${status} by user ${userId}, duration: ${call.duration} seconds`
      );

      // Tạo Message cho cuộc gọi nếu status là "answered" hoặc "ended"
      if (call.status === "answered" || call.status === "ended") {
        const content = `${
          call.callType === "video" ? "Video call" : "Voice call"
        } - ${
          call.duration
            ? `${Math.floor(call.duration / 60)}:${(call.duration % 60)
                .toString()
                .padStart(2, "0")}`
            : "Missed"
        }`;
        const message = new Message({
          conversationId: call.conversationId._id,
          userId: userId,
          content,
          messageType: "call",
          callId: call._id,
          status: {
            sent: true,
            receivedBy: [],
            readBy: [],
          },
          createdAt: new Date(),
        });
        await message.save();
        logger.info(
          `[CallHandler] Created message ${message._id} for call ${callId}`
        );

        // Cập nhật lastMessage của Conversation
        await Conversation.updateOne(
          { _id: call.conversationId._id },
          { lastMessage: message._id, updateAt: new Date() }
        );

        // Chuẩn hóa messageData với conversationId dạng string
        const messageData = {
          _id: message._id.toString(),
          conversationId: message.conversationId.toString(),
          userId: message.userId.toString(),
          content: message.content,
          messageType: message.messageType,
          callId: message.callId?.toString(),
          status: message.status,
          createdAt: message.createdAt,
          isRevoked: message.isRevoked || false,
        };
        socketService.emitToUser(call.callerId, "newMessage", messageData);
        socketService.emitToUser(call.receiverId, "newMessage", messageData);
      }

      // Thông báo lý do cụ thể cho người gọi
      const endData = { callId, status, duration: call.duration };
      if (reason === "media_error") {
        endData.errorMessage = "Receiver could not access camera or microphone";
      }

      socketService.emitToUser(call.callerId, "callEnded", endData);
      socketService.emitToUser(call.receiverId, "callEnded", endData);
      socket.emit("callStatus", { callId, status, duration: call.duration });
    } catch (error) {
      logger.error(`[CallHandler] Failed to end call:`, error);
      errorHandler(socket, "Failed to end call", error);
    }
  },

  // Handle ICE candidate exchange for WebRTC
  handleIceCandidate(socket, { callId, candidate, toUserId }, userId) {
    if (!callId || !candidate || !toUserId) {
      logger.error(`[CallHandler] Invalid ICE candidate data:`, {
        callId,
        candidate,
        toUserId,
        userId,
      });
      return errorHandler(socket, "Invalid ICE candidate data");
    }

    try {
      socketService.emitToUser(toUserId, "iceCandidate", { callId, candidate });
      logger.info(
        `[CallHandler] ICE candidate sent from ${userId} to ${toUserId}`
      );
    } catch (error) {
      logger.error(`[CallHandler] Failed to send ICE candidate:`, error);
      errorHandler(socket, "Failed to send ICE candidate", error);
    }
  },
};
