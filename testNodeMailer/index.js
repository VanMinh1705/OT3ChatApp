const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = 3000;

io.on("connection", (socket) => {
  console.log("A user connected");

  // Xử lý khi một tin nhắn được gửi từ client
  socket.on("message", (data) => {
    // Phân phát tin nhắn đến tất cả các client khác
    socket.broadcast.emit("message", data);
  });

  // Xử lý khi một client ngắt kết nối
  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

server.listen(PORT, () => {
  console.log(`WebSocket server is running on port ${PORT}`);
});
