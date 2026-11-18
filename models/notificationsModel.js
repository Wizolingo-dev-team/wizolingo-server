// models/notificationsModel.js
const mongoose = require("mongoose");

const notificationsSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["order", "download", "newsletter", "auth", "system"],
      default: "system",
    },
    onClick: {
      type: String,
      default: "/",
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("notifications", notificationsSchema);

