// app.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const multer = require("multer");

const createApp = (io = null) => {
  const app = express();

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

  return app;
};

module.exports = createApp;

