const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());

io.on("connection", (socket) => {
  console.log("New user connected: " + socket.id);

  // Handle user registration
  socket.on("register", (userId) => {
    socket.userId = userId; // Store userId in socket
    console.log(`User registered: ${userId}`);
  });

  // Handle call request
  socket.on("call-user", (data) => {
    console.log(`Calling user: ${data.to} from ${data.from}`);
    io.to(data.to).emit("call-made", {
      signal: data.signal,
      from: data.from,
    });
  });

  // Handle answer call
  socket.on("accept-call", (data) => {
    console.log(`Call accepted by: ${data.to}`);
    io.to(data.to).emit("call-accepted", {
      signal: data.signal,
      from: socket.userId, // Use the stored userId
    });
  });

  // Handle decline call
  socket.on("decline-call", (data) => {
    console.log(`Call declined by: ${socket.userId}`);
    io.to(data.to).emit("call-declined", {
      from: socket.userId,
    });
  });

  // Handle ICE candidate
  socket.on("send-candidate", (data) => {
    io.to(data.to).emit("receive-candidate", {
      candidate: data.candidate,
      from: socket.userId,
    });
  });

  // Clean up when a user disconnects
  socket.on("disconnect", () => {
    console.log("User disconnected: " + socket.userId);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
