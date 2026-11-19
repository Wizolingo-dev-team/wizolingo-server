// routes/activityRoute.js
const express = require("express");
const router = express.Router();
const Activity = require("../models/activityModel");
const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");

// User: Get own activities (/my-activities and /my-logs)
const getMyActivities = async (req, res) => {
  try {
    const activities = await Activity.find({ user: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ success: true, data: activities });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

router.get("/my-activities", authMiddleware, getMyActivities);
router.get("/my-logs", authMiddleware, getMyActivities);

// User: Log custom activity (e.g. LOGOUT)
router.post("/log", authMiddleware, async (req, res) => {
  try {
    const { action, details } = req.body;
    const log = await new Activity({
      user: req.user.userId,
      action: action || "LOGIN",
      details: details || "Activity logged",
      ipAddress: req.ip,
    }).save();
    res.status(201).json({ success: true, message: "Activity logged", data: log });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// User: Delete a single activity log
router.delete("/delete/:id", authMiddleware, async (req, res) => {
  try {
    const deleted = await Activity.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId,
    });
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Activity log not found" });
    }
    res.json({ success: true, message: "Activity log entry deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// User: Delete all own activity logs
router.delete("/delete-all", authMiddleware, async (req, res) => {
  try {
    await Activity.deleteMany({ user: req.user.userId });
    res.json({ success: true, message: "Activity history cleared" });
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
