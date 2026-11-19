// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const bodyParser = require("body-parser");
const multer = require("multer");
require("dotenv").config();

// Connect MongoDB
require("./config/dbConfig");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use(cors());
app.use(bodyParser.json({ limit: "1gb" }));
app.use(bodyParser.urlencoded({ limit: "1gb", extended: true }));

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 1 * 1024 * 1024 * 1024 },
});

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

// Routes
const usersRoute = require("./routes/usersRoute")(upload);
const profileRoute = require("./routes/profileRoute")(upload);
const notificationsRoute = require("./routes/notificationsRoute");
const categoryRoute = require("./routes/categoryRoute");
const discountRoute = require("./routes/discountRoute");
const productsRoute = require("./routes/productsRoute");
const wishlistRoute = require("./routes/wishlistRoute");
const orderRoute = require("./routes/orderRoute");
const paymentsRoute = require("./routes/paymentsRoute");
const newsletterRoute = require("./routes/newsletterRoute");
const eventsRoute = require("./routes/eventsRoute");
const activityRoute = require("./routes/activityRoute");

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Wizolingo Server API is running",
  });
});

app.use("/api/users", usersRoute);
app.use("/api/profile", profileRoute);
app.use("/api/notifications", notificationsRoute);
app.use("/api/products", productsRoute);
app.use("/api/categories", categoryRoute);
app.use("/api/discounts", discountRoute);
app.use("/api/wishlists", wishlistRoute);
app.use("/api/order", orderRoute);
app.use("/api/payment", paymentsRoute.router);
app.use("/api/newsletter", newsletterRoute);
app.use("/api/events", eventsRoute);
app.use("/api/activity", activityRoute);

const port = process.env.PORT || 6000;
server.listen(port, () =>
  console.log(`Wizolingo Node JS server with Socket.io listening on port ${port}`)
);

