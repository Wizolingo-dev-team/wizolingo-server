// routes/discountRoute.js
const express = require("express");
const router = express.Router();
const Discount = require("../models/discountModel");
const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");

// Admin: Create discount
router.post("/create", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const discount = new Discount(req.body);
    await discount.save();
    res.status(201).json({
      success: true,
      message: "Discount created successfully",
      data: discount,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin: Get all discounts
router.get(
  "/admin/all",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const discounts = await Discount.find()
        .populate("products", "productName price productType")
        .sort({ createdAt: -1 });
      res.json({ success: true, data: discounts });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// User: Validate discount code
router.post("/validate", authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;
    const discount = await Discount.findOne({
      discountCode: code?.trim().toUpperCase(),
      isActive: true,
      expiryDate: { $gt: new Date() },
    });

    if (!discount) {
      return res.status(404).json({
        success: false,
        message: "Invalid or expired discount code",
      });
    }

    res.json({ success: true, data: discount });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin: Update discount
router.put("/update/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const updated = await Discount.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Discount not found" });
    }
    res.json({
      success: true,
      message: "Discount updated successfully",
      data: updated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin: Delete discount
router.delete(
  "/delete/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const deleted = await Discount.findByIdAndDelete(req.params.id);
      if (!deleted) {
        return res
          .status(404)
          .json({ success: false, message: "Discount not found" });
      }
      res.json({ success: true, message: "Discount deleted successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

module.exports = router;

