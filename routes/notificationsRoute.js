// routes/notificationsRoute.js
const router = require("express").Router();
const Notification = require("../models/notificationsModel");
const User = require("../models/userModel");
const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");
const { errorHandler } = require("../helpers/dbErrorHandler");

// Add a notification (authenticated user or admin targeting a user)
router.post("/add-notification", authMiddleware, async (req, res) => {
  try {
    const targetUser = req.body.user || req.user.userId;
    const newNotification = new Notification({
      ...req.body,
      user: targetUser,
    });
    await newNotification.save();

    if (req.io) {
      req.io
        .to(targetUser.toString())
        .emit("new-notification", newNotification);
    }

    res.status(201).send({
      success: true,
      data: newNotification,
      message: "Notification added successfully",
    });
  } catch (error) {
    res.status(500).send({ success: false, message: error.message });
  }
});

// Get logged-in user's notifications
router.get("/get-all-notifications", authMiddleware, async (req, res) => {
  try {
    const notifications = await Notification.find({
      user: req.user.userId,
    }).sort({ createdAt: -1 });

    res.send({
      success: true,
      data: notifications,
    });
  } catch (error) {
    res.status(500).send({
      message: errorHandler(error),
      success: false,
    });
  }
});

// Mark all notifications as read for logged-in user
router.post("/mark-as-read", authMiddleware, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.userId, read: false },
      { read: true }
    );
    const notifications = await Notification.find({
      user: req.user.userId,
    }).sort({ createdAt: -1 });

    res.send({
      success: true,
      message: "Notifications marked as read",
      data: notifications,
    });
  } catch (error) {
    res.status(500).send({
      message: errorHandler(error),
      success: false,
    });
  }
});

// Mark single notification as read
router.post("/mark-as-read/:id", authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).send({
        success: false,
        message: "Notification not found",
      });
    }

    if (
      notification.user.toString() !== req.user.userId &&
      req.user.role !== "admin"
    ) {
      return res.status(403).send({
        success: false,
        message: "Access denied",
      });
    }

    notification.read = true;
    await notification.save();

    res.send({
      success: true,
      message: "Notification marked as read",
      data: notification,
    });
  } catch (error) {
    res.status(500).send({
      message: errorHandler(error),
      success: false,
    });
  }
});

// Update notification (Admin or owner)
router.put("/update-notification/:id", authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res
        .status(404)
        .send({ success: false, message: "Notification not found" });
    }

    if (
      notification.user.toString() !== req.user.userId &&
      req.user.role !== "admin"
    ) {
      return res
        .status(403)
        .send({ success: false, message: "Access denied" });
    }

    const updated = await Notification.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.send({
      success: true,
      message: "Notification updated successfully",
      data: updated,
    });
  } catch (error) {
    res.status(500).send({
      message: errorHandler(error),
      success: false,
    });
  }
});

// Delete single notification
router.delete("/delete-notification/:id", authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).send({
        success: false,
        message: "Notification not found",
      });
    }

    if (
      notification.user.toString() !== req.user.userId &&
      req.user.role !== "admin"
    ) {
      return res.status(403).send({
        success: false,
        message: "Access denied",
      });
    }

    await Notification.findByIdAndDelete(req.params.id);

    res.send({
      success: true,
      message: "Notification deleted successfully",
      data: notification,
    });
  } catch (error) {
    res.status(500).send({
      message: errorHandler(error),
      success: false,
    });
  }
});

// Delete all notifications for logged-in user
router.delete("/delete-all-notifications", authMiddleware, async (req, res) => {
  try {
    await Notification.deleteMany({
      user: req.user.userId,
    });
    res.send({
      success: true,
      message: "All notifications deleted",
    });
  } catch (error) {
    res.status(500).send({
      message: errorHandler(error),
      success: false,
    });
  }
});

// Admin: Get all notifications across users
router.get(
  "/admin/all-notifications",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const notifications = await Notification.find()
        .populate("user", "firstName lastName email role")
        .sort({ createdAt: -1 })
        .limit(200);

      res.send({
        success: true,
        data: notifications,
      });
    } catch (error) {
      res.status(500).send({
        message: errorHandler(error),
        success: false,
      });
    }
  }
);

// Admin: Broadcast in-app notification to a specific user or all users
router.post(
  "/admin/broadcast",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { userId, title, description, type, onClick } = req.body;
      if (!title || !description) {
        return res.status(400).send({
          success: false,
          message: "Title and description are required",
        });
      }

      let targetUserIds = [];
      if (userId) {
        targetUserIds = [userId];
      } else {
        const users = await User.find({ role: "user" }).select("_id");
        targetUserIds = users.map((u) => u._id);
      }

      const createdNotifications = await Notification.insertMany(
        targetUserIds.map((id) => ({
          user: id,
          title,
          description,
          type: type || "system",
          onClick: onClick || "/",
        }))
      );

      if (req.io) {
        for (const notif of createdNotifications) {
          req.io.to(notif.user.toString()).emit("new-notification", notif);
        }
      }

      res.status(201).send({
        success: true,
        message: `Broadcasted notification to ${createdNotifications.length} user(s)`,
        data: createdNotifications,
      });
    } catch (error) {
      res.status(500).send({
        message: errorHandler(error),
        success: false,
      });
    }
  }
);

module.exports = router;

