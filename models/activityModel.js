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
        "DIGITAL_DOWNLOADED",
        "WISHLIST_UPDATED",
        "LOGOUT",
        "PROFILE_UPDATED",
        "PASSWORD_CHANGED",
        "NEWSLETTER_SENT",
      ],
    },
    details: { type: String, required: true },
    ipAddress: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("activities", activitySchema);

