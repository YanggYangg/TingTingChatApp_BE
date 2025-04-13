let io = null;
const Message = require('../models/Message');
const userSocketMap = {}; // {userId: socketId}
const userConversationMap = {}; // {userId: [conversationIds]}

function initializeSocket(server) {
    const { Server } = require("socket.io");
    io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            credentials: true,
        },
        pingTimeout: 60000,
        pingInterval: 25000,
    });

    io.on("connection", handleConnection);
    return io;
}

function handleConnection(socket) {
    console.log(`Client connected: ${socket.id}`);

    const userId = socket.handshake.query.userId;
    if (userId) {
        userSocketMap[userId] = socket.id;
        console.log(`User ${userId} is mapped to socket ${socket.id}`);
    }

    io.emit("getOnlineUsers", Object.keys(userSocketMap));
    console.log("Online users updated:", Object.keys(userSocketMap));

    socket.on("disconnect", () => handleDisconnect(socket, userId));
    socket.on("joinConversation", (data) => handleJoinConversation(socket, data, userId));
    socket.on("leaveConversation", (data) => handleLeaveConversation(socket, data, userId));
    socket.on("typing", (data) => handleTyping(socket, data, userId));
    socket.on("stopTyping", (data) => handleStopTyping(socket, data, userId));
    socket.on("sendMessage", (data) => handleSendMessage(socket, data, userId));
    socket.on("readMessage", (data) => handleReadMessage(socket, data, userId));
}

function handleDisconnect(socket, userId) {
    console.log(`Client disconnected: ${socket.id}`);
    if (userId) {
        delete userSocketMap[userId];
        console.log(`Removed user ${userId} from online users`);
    }
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
    console.log("Online users updated:", Object.keys(userSocketMap));
}

async function handleJoinConversation(socket, { conversationId }, userId) {
    if (!conversationId) return;
    socket.join(conversationId);

    if (userId) {
        if (!userConversationMap[userId]) {
            userConversationMap[userId] = [];
        }
        if (!userConversationMap[userId].includes(conversationId)) {
            userConversationMap[userId].push(conversationId);
        }
    }

    try {
        // Load messages for this conversation
        const messages = await Message.find({ conversationId })
            .sort({ createdAt: 1 })
            .lean();

        // Send messages to the user who just joined
        socket.emit("loadMessages", messages);
        console.log(`Loaded ${messages.length} messages for conversation ${conversationId}`);

        console.log(`User ${userId} joined conversation ${conversationId}`);
        socket.emit("joined", { conversationId });
    } catch (error) {
        console.error("Error loading messages:", error);
        socket.emit("error", { message: "Failed to load messages", error: error.message });
    }
}
async function handleLeaveConversation(socket, { conversationId }, userId) {
    if (!conversationId) return;
    socket.leave(conversationId);

    if (userId && userConversationMap[userId]) {
        userConversationMap[userId] = userConversationMap[userId].filter(id => id !== conversationId);
    }

    console.log(`User ${userId} left conversation ${conversationId}`);
    socket.emit("left", { conversationId });
}

async function handleSendMessage(socket, { conversationId, message }, userId) {
    if (!conversationId || !message) {
        return socket.emit("error", { message: "Invalid message data" });
    }

    if (!message.content?.trim() && message.messageType === "text") {
        return socket.emit("error", { message: "Text message cannot be empty" });
    }

    if (["image", "file", "video"].includes(message.messageType) && !message.linkURL) {
        return socket.emit("error", { message: "File message must have a linkURL" });
    }

    try {
        const newMessage = new Message({
            conversationId,
            userId,
            content: message.content?.trim() || "",
            messageType: message.messageType,
            linkURL: message.linkURL || null,
            status: {
                sent: true,
                receivedBy: [],
                readBy: []
            },
            createdAt: new Date()
        });

        // Save message to database
        await newMessage.save();
        console.log(`Message saved to database: ${newMessage._id}`);

        // Emit to all users in the conversation except the sender
        socket.to(conversationId).emit("receiveMessage", newMessage);

        // Send acknowledgment to the sender
        socket.emit("messageSent", newMessage);

        console.log(`Message sent to conversation ${conversationId} by user ${userId}`);
    } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("error", { message: "Failed to send message", error: error.message });
    }
}

function handleTyping(socket, { conversationId }, userId) {
    if (!conversationId || !userId) return;
    socket.to(conversationId).emit("userTyping", { userId, conversationId });
}

function handleStopTyping(socket, { conversationId }, userId) {
    if (!conversationId || !userId) return;
    socket.to(conversationId).emit("userStopTyping", { userId, conversationId });
}

async function handleReadMessage(socket, { conversationId, messageId }, userId) {
    if (!conversationId || !messageId || !userId) {
        return socket.emit("error", { message: "Invalid read message data" });
    }

    try {
        // Tìm tin nhắn trong database
        const message = await Message.findById(messageId);
        if (!message) {
            return socket.emit("error", { message: "Message not found" });
        }

        // Kiểm tra xem user đã đọc tin nhắn chưa
        if (!message.status.readBy.includes(userId)) {
            // Thêm userId vào danh sách đã đọc
            message.status.readBy.push(userId);
            await message.save();

            // Thông báo cho tất cả user trong conversation biết tin nhắn đã được đọc
            io.to(conversationId).emit("messageRead", {
                messageId,
                userId,
                readBy: message.status.readBy
            });

            console.log(`User ${userId} read message ${messageId} in conversation ${conversationId}`);
        }
    } catch (error) {
        console.error("Error handling read message:", error);
        socket.emit("error", { message: "Failed to mark message as read", error: error.message });
    }
}

// Socket service methods
const socketService = {
    getIO() {
        if (!io) {
            throw new Error('Socket.io not initialized!');
        }
        return io;
    },

    getReceiverSocketId(userId) {
        return userSocketMap[userId];
    },

    getUserConversations(userId) {
        return userConversationMap[userId] || [];
    },

    emitToUser(userId, event, data) {
        const socketId = userSocketMap[userId];
        if (socketId && io) {
            io.to(socketId).emit(event, data);
        }
    },

    emitToConversation(conversationId, event, data) {
        if (io) {
            io.to(conversationId).emit(event, data);
        }
    },

    emitToAll(event, data) {
        if (io) {
            io.emit(event, data);
        }
    },

    isUserOnline(userId) {
        return !!userSocketMap[userId];
    },

    getOnlineUsers() {
        return Object.keys(userSocketMap);
    },

    async handleMessage(message, conversation) {
        if (!io) return;

        this.emitToConversation(conversation._id, "receiveMessage", message);

        const offlineUsers = conversation.participants.filter(participantId =>
            !this.isUserOnline(participantId) && participantId !== message.userId
        );

        return offlineUsers;
    }
};

module.exports = {
    initializeSocket,
    socketService
};
