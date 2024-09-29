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

// Function to generate a random 3-character ID
const generateRandomId = () => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 3; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

io.on("connection", (socket) => {
  // Assign a random 3-character ID to the user
  const userId = generateRandomId();
  console.log("New user connected: " + userId);

  // Handle call request
  socket.on("call-user", (data) => {
    io.to(data.to).emit("call-made", {
      signal: data.signal,
      socket: userId,
    });
  });

  // Handle answer call
  socket.on("accept-call", (data) => {
    io.to(data.to).emit("call-accepted", {
      from: userId,
      signal: data.signal,
    });
  });

  // Handle decline call
  socket.on("decline-call", (data) => {
    io.to(data.to).emit("call-declined", {
      from: userId,
    });
  });

  // Handle ICE candidate
  socket.on("send-candidate", (data) => {
    io.to(data.to).emit("receive-candidate", {
      candidate: data.candidate,
      socket: userId,
    });
  });

  // Clean up when a user disconnects
  socket.on("disconnect", () => {
    console.log("User disconnected: " + userId);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
