// routes/orderRoute.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Order = require("../models/orderModel");
const Product = require("../models/productModel");
const DeliveryFee = require("../models/deliveryFeeModel");
const Discount = require("../models/discountModel");
const Activity = require("../models/activityModel");
const Notification = require("../models/notificationsModel");
const User = require("../models/userModel");
const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");
const emailServices = require("../utils/emailServices");
const { initiatePaypalPayment } = require("./paymentsRoute");

// User: Create Order (Merch, Digital Music, or Mixed)
router.post("/create-order", authMiddleware, async (req, res) => {
  const {
    products: itemsFromClient,
    phone,
    address,
    city,
    state,
    country,
    postalCode,
    email,
    additionalInfo,
    discountCode,
    currency,
  } = req.body;
  const userId = req.user.userId;

  if (!Array.isArray(itemsFromClient) || itemsFromClient.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "No order items provided" });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const enrichedProducts = [];
    let itemsSubtotal = 0;
    let hasMerch = false;
    let hasDigital = false;

    for (const item of itemsFromClient) {
      const productDoc = await Product.findById(item._id).session(session);
      if (!productDoc) {
        throw new Error(`Product ${item._id} not found`);
      }

      const qty = Number(item.quantity || 1);

      if (productDoc.productType === "merch") {
        hasMerch = true;
        if (productDoc.quantity < qty) {
          throw new Error(`Insufficient stock for ${productDoc.productName}`);
        }
        productDoc.quantity -= qty;
      } else {
        hasDigital = true;
      }

      productDoc.sold += qty;
      await productDoc.save({ session });

      const unitPrice = productDoc.price;
      itemsSubtotal += unitPrice * qty;

      enrichedProducts.push({
        _id: productDoc._id,
        productName: productDoc.productName,
        productType: productDoc.productType,
        price: unitPrice,
        quantity: qty,
        size: item.size || "",
        color: item.color || "",
        attachments: productDoc.attachments,
      });
    }

    const orderType =
      hasMerch && hasDigital ? "mixed" : hasDigital ? "digital" : "merch";

    // Only calculate shipping delivery fee if order contains physical merch
    let deliveryFee = 0;
    if (hasMerch && country) {
      const deliveryFeeRecord = await DeliveryFee.findOne({
        country: country.trim().toLowerCase(),
      });
      const deliveryFeeObj = deliveryFeeRecord?.states.find(
        (s) => s.state === state?.trim().toLowerCase()
      );
      deliveryFee = deliveryFeeObj ? deliveryFeeObj.fee : 0;
    }

    // Apply optional discount code
    let discountAmount = 0;
    let appliedDiscountCode = "";
    if (discountCode) {
      const discount = await Discount.findOne({
        discountCode: discountCode.trim().toUpperCase(),
        isActive: true,
        expiryDate: { $gt: new Date() },
      });
      if (discount) {
        discountAmount = Number(
          ((itemsSubtotal * discount.discountPercentage) / 100).toFixed(2)
        );
        appliedDiscountCode = discount.discountCode;
      }
    }

    const totalAmount = Math.max(
      0,
      Number((itemsSubtotal - discountAmount + deliveryFee).toFixed(2))
    );
    const txRef = `wiz_${Date.now()}`;

    const newOrder = new Order({
      products: enrichedProducts,
      orderType,
      subtotal: itemsSubtotal,
      deliveryFee,
      discountCode: appliedDiscountCode,
      discountAmount,
      amount: totalAmount,
      currency: currency || "USD",
      phone: phone || "",
      address: address || "",
      city: city || "",
      state: state || "",
      country: country || "",
      postalCode: postalCode || "",
      additionalInfo: additionalInfo || "",
      user: userId,
      email: email || req.body.email,
      transactionRef: txRef,
      paymentMethod: "paypal",
      paymentStatus: "pending",
      downloadUnlocked: false,
    });

    await newOrder.save({ session });

    await new Activity({
      user: userId,
      action: "ORDER_CREATED",
      details: `Placed a new ${orderType} order: #${newOrder._id
        .toString()
        .slice(-8)
        .toUpperCase()}`,
      ipAddress: req.ip,
    }).save({ session });

    await session.commitTransaction();
    session.endSession();

    const paymentResponse = await initiatePaypalPayment(
      totalAmount,
      newOrder.currency,
      newOrder._id
    );

    // Notify Customer
    const customerNotification = new Notification({
      user: userId,
      title: "Order Placed Successfully",
      description: `Your order #${newOrder._id
        .toString()
        .slice(-8)
        .toUpperCase()} has been received and is awaiting payment confirmation.`,
      type: "order",
      onClick: `/orders/${newOrder._id}`,
    });
    await customerNotification.save();
    if (req.io) {
      req.io
        .to(userId.toString())
        .emit("new-notification", customerNotification);
    }

    // Notify All Admins
    const admins = await User.find({ role: "admin" });
    for (const admin of admins) {
      const adminNotification = new Notification({
        user: admin._id,
        title: "New Order Alert!",
        description: `A new ${orderType} order of $${totalAmount.toFixed(
          2
        )} was placed by ${newOrder.email}`,
        type: "order",
        onClick: "/admin/orders",
      });
      await adminNotification.save();
      if (req.io) {
        req.io
          .to(admin._id.toString())
          .emit("new-notification", adminNotification);
      }
    }

    await emailServices.sendOrderConfirmation(newOrder.email, newOrder);
    await emailServices.sendAdminOrderNotification(newOrder);

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: {
        order: newOrder,
        payment: paymentResponse,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ success: false, message: error.message });
  }
});

// User: Get My Orders
router.get("/get-user-orders", authMiddleware, async (req, res) => {
  try {
    const userOrders = await Order.find({ user: req.user.userId })
      .populate("user", "firstName lastName email")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: userOrders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// User: Get My Purchased Digital Music Downloads
router.get("/get-my-downloads", authMiddleware, async (req, res) => {
  try {
    const paidOrders = await Order.find({
      user: req.user.userId,
      orderType: { $in: ["digital", "mixed"] },
      $or: [
        { downloadUnlocked: true },
        { paymentStatus: "completed" },
        { status: { $in: ["Payment Confirmed", "Delivered"] } },
      ],
    }).sort({ createdAt: -1 });

    const productIds = [];
    for (const order of paidOrders) {
      for (const item of order.products) {
        if (item.productType === "digital_music" && item._id) {
          productIds.push(item._id);
        }
      }
    }

    const digitalProducts = await Product.find({
      _id: { $in: productIds },
      productType: "digital_music",
    }).select("productName artist digitalReleaseType duration attachments digitalFiles");

    res.json({ success: true, data: digitalProducts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Public: Get Available Order Statuses
router.get("/status", (req, res) => {
  res.json({
    success: true,
    data: [
      "Processing",
      "Payment Confirmed",
      "On the way",
      "Delivered",
      "Cancelled",
    ],
  });
});

// Admin: Get All Orders
router.get(
  "/admin/all-orders",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const orders = await Order.find()
        .populate("user", "firstName lastName email phoneNumber")
        .sort({ createdAt: -1 });

      res.json({ success: true, data: orders });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Admin: Update Order Status (also unlocks digital downloads when confirmed)
router.put(
  "/admin/update-order-status/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { status, paymentStatus } = req.body;
      const order = await Order.findById(req.params.id);

      if (!order) {
        return res
          .status(404)
          .json({ success: false, message: "Order not found" });
      }

      if (status) order.status = status;
      if (paymentStatus) order.paymentStatus = paymentStatus;
      order.updated = new Date();

      if (
        (status === "Payment Confirmed" ||
          status === "Delivered" ||
          paymentStatus === "completed") &&
        (order.orderType === "digital" || order.orderType === "mixed")
      ) {
        order.downloadUnlocked = true;
        order.paymentStatus = "completed";
      }

      await order.save();

      const notification = new Notification({
        user: order.user,
        title: "Order Status Updated",
        description: `Order #${order._id
          .toString()
          .slice(-8)
          .toUpperCase()} is now "${order.status}".`,
        type: order.downloadUnlocked ? "download" : "order",
        onClick: `/orders/${order._id}`,
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
        message: "Order updated successfully",
        data: order,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

module.exports = router;

