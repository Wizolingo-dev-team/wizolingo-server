// models/newsletterSubscriberModel.js
const mongoose = require("mongoose");
const crypto = require("crypto");

const newsletterSubscriberSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      trim: true,
      default: "",
    },
    source: {
      type: String,
      enum: ["popup", "footer", "checkout", "admin", "other"],
      default: "popup",
    },
    status: {
      type: String,
      enum: ["subscribed", "unsubscribed"],
      default: "subscribed",
    },
    unsubscribeToken: {
      type: String,
      default: () => crypto.randomBytes(24).toString("hex"),
    },
    subscribedAt: {
      type: Date,
      default: Date.now,
    },
    unsubscribedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "newsletterSubscribers",
  newsletterSubscriberSchema
);

