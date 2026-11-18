// routes/paymentsRoute.js
const express = require("express");
const router = express.Router();
const Order = require("../models/orderModel");
const Activity = require("../models/activityModel");
const Notification = require("../models/notificationsModel");
const authMiddleware = require("../middlewares/authMiddleware");
const emailServices = require("../utils/emailServices");

/**
 * PayPal Payment Gateway Placeholder
 * Ready to be wired up with PayPal REST API / @paypal/checkout-server-sdk
 * once PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, and PAYPAL_MODE are configured.
 */
const initiatePaypalPayment = async (amount, currency = "USD", orderId) => {
  // Placeholder response until PayPal credentials & SDK integration are added
  return {
    provider: "paypal",
    status: "PENDING_IMPLEMENTATION",
    paypalOrderId: `PAYPAL_PLACEHOLDER_${orderId}_${Date.now()}`,
    approvalUrl: null,
    amount,
    currency,
    message:
      "PayPal checkout integration is scheduled for implementation. Order recorded as pending.",
  };
};

// Create PayPal Order (Protected)
router.post("/paypal/create-order", authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    const paymentSession = await initiatePaypalPayment(
      order.amount,
      order.currency,
      order._id
    );

    order.paypalOrderId = paymentSession.paypalOrderId;
    await order.save();

    res.json({
      success: true,
      data: paymentSession,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Capture PayPal Order (Placeholder for PayPal capture callback)
router.post("/paypal/capture-order", authMiddleware, async (req, res) => {
  try {
    const { orderId, paypalOrderId, transactionId } = req.body;
    const order = await Order.findById(orderId);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // TODO: Verify capture with PayPal Orders API when PayPal is implemented
    order.paymentStatus = "completed";
    order.status = "Payment Confirmed";
    order.paidAmount = order.amount;
    order.paypalOrderId = paypalOrderId || order.paypalOrderId;
    order.transaction_id = transactionId || order.transaction_id;

    if (order.orderType === "digital" || order.orderType === "mixed") {
      order.downloadUnlocked = true;
    }

    await order.save();

    await new Activity({
      user: order.user,
      action: "PAYMENT_COMPLETED",
      details: `Payment confirmed for Order #${order._id.toString().slice(-8).toUpperCase()}`,
      ipAddress: req.ip,
    }).save();

    const notification = new Notification({
      user: order.user,
      title: "Payment Confirmed",
      description: order.downloadUnlocked
        ? "Your payment is confirmed and your digital music downloads are now unlocked!"
        : "Your payment is confirmed. Your merch order is being prepared.",
      type: order.downloadUnlocked ? "download" : "order",
      onClick: order.downloadUnlocked ? "/downloads" : `/orders/${order._id}`,
    });
    await notification.save();
    if (req.io) {
      req.io.to(order.user.toString()).emit("new-notification", notification);
    }

    await emailServices.sendOrderStatusUpdate(
      order.email,
      order.status,
      order._id,
      order.downloadUnlocked
    );

    res.json({
      success: true,
      message: "Payment captured successfully",
      data: order,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PayPal Webhook Placeholder
router.post("/webhook", express.json(), async (req, res) => {
  // TODO: Verify PayPal webhook signature headers when PayPal is implemented
  res.status(200).json({
    success: true,
    message: "PayPal webhook endpoint ready",
  });
});

module.exports = { router, initiatePaypalPayment };

