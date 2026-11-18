// routes/wishlistRoute.js
const express = require("express");
const router = express.Router();
const Wishlist = require("../models/wishlistModel");
const Activity = require("../models/activityModel");
const authMiddleware = require("../middlewares/authMiddleware");

// Get logged-in user's wishlist
router.get("/", authMiddleware, async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user.userId }).populate(
      "products"
    );
    res.json({
      success: true,
      data: wishlist || { user: req.user.userId, products: [] },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Toggle product in wishlist
router.post("/toggle", authMiddleware, async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user.userId;

    let wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) {
      wishlist = new Wishlist({ user: userId, products: [productId] });
    } else {
      const exists = wishlist.products.some(
        (id) => id.toString() === productId
      );
      if (exists) {
        wishlist.products = wishlist.products.filter(
          (id) => id.toString() !== productId
        );
      } else {
        wishlist.products.push(productId);
      }
    }

    await wishlist.save();

    await new Activity({
      user: userId,
      action: "WISHLIST_UPDATED",
      details: `Updated wishlist for product ${productId}`,
      ipAddress: req.ip,
    }).save();

    const populated = await wishlist.populate("products");
    res.json({
      success: true,
      message: "Wishlist updated",
      data: populated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

