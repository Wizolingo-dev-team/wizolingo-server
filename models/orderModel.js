// models/orderModel.js
const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    products: [
      {
        _id: { type: mongoose.Schema.Types.ObjectId, ref: "products" },
        productName: String,
        productType: { type: String, enum: ["merch", "digital_music"] },
        price: Number,
        quantity: Number,
        size: String,
        color: String,
        attachments: [String],
      },
    ],
    orderType: {
      type: String,
      enum: ["merch", "digital", "mixed"],
      default: "merch",
    },
    transaction_id: { type: mongoose.Schema.Types.Mixed },
    transactionRef: { type: String, index: true },
    paypalOrderId: { type: String, default: "" },
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
    currency: { type: String, default: "USD" },
    subtotal: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 0 },
    discountCode: { type: String, default: "" },
    discountAmount: { type: Number, default: 0 },
    amount: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    email: { type: String, required: true },
    phone: String,
    address: String,
    city: String,
    state: String,
    country: String,
    postalCode: String,
    additionalInfo: String,
    status: {
      type: String,
      default: "Processing",
      enum: [
        "Processing",
        "Payment Confirmed",
        "On the way",
        "Delivered",
        "Cancelled",
      ],
    },
    downloadUnlocked: {
      type: Boolean,
      default: false,
    },
    updated: Date,
    user: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("orders", OrderSchema);

