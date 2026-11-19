// models/ticketOrderModel.js
const mongoose = require("mongoose");
const crypto = require("crypto");

const ticketItemSchema = new mongoose.Schema(
  {
    tierId: { type: mongoose.Schema.Types.ObjectId, required: true },
    tierName: { type: String, required: true },
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true },
  },
  { _id: false }
);

const ticketOrderSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "events",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    attendeeName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, default: "", trim: true },
    tickets: {
      type: [ticketItemSchema],
      required: true,
    },
    totalAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "USD" },
    ticketCode: {
      type: String,
      unique: true,
      default: () =>
        `WIZ-TKT-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
    },
    paymentMethod: {
      type: String,
      enum: ["paypal", "manual"],
      default: "paypal",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
    },
    paypalOrderId: { type: String, default: "" },
    transactionRef: { type: String, index: true },
    transaction_id: { type: mongoose.Schema.Types.Mixed },
    status: {
      type: String,
      enum: ["Processing", "Confirmed", "Checked In", "Cancelled"],
      default: "Processing",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ticketOrders", ticketOrderSchema);

