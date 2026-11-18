// routes/activityRoute.js
const express = require("express");
const router = express.Router();
const Activity = require("../models/activityModel");
const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");

// User: Get own activities
router.get("/my-activities", authMiddleware, async (req, res) => {
  try {
    const activities = await Activity.find({ user: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ success: true, data: activities });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin: Get all activities
router.get(
  "/admin/all",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const activities = await Activity.find()
        .populate("user", "firstName lastName email role")
        .sort({ createdAt: -1 })
        .limit(200);
      res.json({ success: true, data: activities });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

module.exports = router;

