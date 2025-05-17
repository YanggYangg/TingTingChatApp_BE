const io = require("socket.io-client");

const socket = io("http://192.168.1.8:5000", {
  query: { userId: "6811d603de06774cb5e1bcbe" }, 
  transports: ["websocket"]
});

socket.on("connect", () => {
  console.log("[Client] Connected to server");

  socket.emit("sendMessage", {
    conversationId: "6816715d8ebe8ec80954e281", 
    message: {
      content: "Tin nhắn test từ Node client",
      messageType: "text"
    }
  });
  console.log("Đã gửi tin nhắn thử nghiệm");
});


socket.on("disconnect", () => {
  console.log("[Client] Disconnected from server");
});
