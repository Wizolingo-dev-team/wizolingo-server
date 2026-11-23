// models/activityModel.js
const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        "LOGIN",
        "ADMIN_LOGIN",
        "ORDER_CREATED",
        "PAYMENT_COMPLETED",
        "TICKET_PURCHASED",
        "DIGITAL_DOWNLOADED",
        "WISHLIST_UPDATED",
        "LOGOUT",
        "PROFILE_UPDATED",
        "PASSWORD_CHANGED",
        "NEWSLETTER_SENT",
        "BLOG_CREATED",
        "BLOG_UPDATED",
        "BLOG_DELETED",
        "BOOKING_CREATED",
        "BOOKING_UPDATED",
        "BOOKING_DELETED",
      ],
    },
    details: { type: String, required: true },
    ipAddress: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("activities", activitySchema);

