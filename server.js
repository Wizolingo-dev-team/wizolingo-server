// server.js
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

// Connect MongoDB
require("./config/dbConfig");

const createApp = require("./app");

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

const app = createApp(io);
server.on("request", app);

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join", (userId) => {
    socket.join(userId);
    console.log(`User joined room: ${userId}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

const port = process.env.PORT || 6000;
server.listen(port, () =>
  console.log(`Wizolingo Node JS server with Socket.io listening on port ${port}`)
);
