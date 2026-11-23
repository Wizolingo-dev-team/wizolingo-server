// routes/bookingsRoute.js
const express = require("express");
const router = express.Router();
const Booking = require("../models/bookingModel");
const Notification = require("../models/notificationsModel");
const Activity = require("../models/activityModel");
const User = require("../models/userModel");
const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");
const emailServices = require("../utils/emailServices");

// ==========================================
// PUBLIC ROUTES
// ==========================================

// POST /api/bookings/create - Submit a new booking inquiry
router.post("/create", async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      eventType,
      eventDate,
      country,
      budget,
      message,
    } = req.body;

    if (!fullName || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "Full name, email, and message are required",
      });
    }

    const booking = new Booking({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : "",
      eventType: eventType || "concert",
      eventDate: eventDate || "",
      country: country ? country.trim() : "",
      budget: budget ? budget.trim() : "",
      message: message.trim(),
      status: "pending",
      ipAddress: req.ip || "",
    });

    await booking.save();

    // Send confirmation email to client (non-blocking)
    emailServices.sendBookingInquiryConfirmation(booking).catch((err) => {
      console.error("[Booking Email] Error sending client confirmation:", err);
    });

    // Send notification email to admin (non-blocking)
    emailServices.sendAdminBookingNotification(booking).catch((err) => {
      console.error("[Booking Email] Error sending admin notification:", err);
    });

    // Create in-app notifications for admins
    User.find({ role: "admin" })
      .select("_id")
      .then((admins) => {
        admins.forEach((admin) => {
          new Notification({
            user: admin._id,
            title: "New Booking Inquiry",
            description: `${booking.fullName} submitted a booking inquiry for ${booking.eventType}`,
            type: "booking",
            onClick: "/bookings",
          })
            .save()
            .catch(() => {});
        });
      })
      .catch(() => {});

    // Real-time socket event
    if (req.io) {
      req.io.emit("new-booking", booking);
    }

    res.status(201).json({
      success: true,
      message: "Booking inquiry submitted successfully",
      data: booking,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// ADMIN ROUTES
// ==========================================

// GET /api/bookings/admin/all - Get all bookings with filtering and pagination
router.get("/admin/all", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, eventType, search } = req.query;
    const query = {};

    if (status && status !== "All") {
      query.status = status;
    }

    if (eventType && eventType !== "All") {
      query.eventType = eventType;
    }

    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { fullName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { country: searchRegex },
        { message: searchRegex },
      ];
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));

    const [bookings, total] = await Promise.all([
      Booking.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Booking.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: bookings,
      total,
      currentPage: parseInt(page, 10),
      totalPages: Math.ceil(total / limitNum) || 1,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/bookings/admin/:id - Get single booking details
router.get("/admin/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking inquiry not found" });
    }
    res.json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/bookings/admin/status/:id - Update booking status and notes
router.put("/admin/status/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking inquiry not found" });
    }

    if (status !== undefined) booking.status = status;
    if (adminNotes !== undefined) booking.adminNotes = adminNotes;

    await booking.save();

    // Log admin activity
    if (req.user?.userId) {
      new Activity({
        user: req.user.userId,
        action: "BOOKING_UPDATED",
        details: `Updated booking for ${booking.fullName} to status "${booking.status}"`,
        ipAddress: req.ip,
      })
        .save()
        .catch(() => {});
    }

    res.json({
      success: true,
      message: "Booking updated successfully",
      data: booking,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/bookings/admin/:id - Delete a booking inquiry
router.delete("/admin/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking inquiry not found" });
    }

    // Log admin activity
    if (req.user?.userId) {
      new Activity({
        user: req.user.userId,
        action: "BOOKING_DELETED",
        details: `Deleted booking inquiry from ${booking.fullName}`,
        ipAddress: req.ip,
      })
        .save()
        .catch(() => {});
    }

    res.json({
      success: true,
      message: "Booking deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

