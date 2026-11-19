// routes/eventsRoute.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const multer = require("multer");
const Event = require("../models/eventModel");
const TicketOrder = require("../models/ticketOrderModel");
const Activity = require("../models/activityModel");
const Notification = require("../models/notificationsModel");
const User = require("../models/userModel");
const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");
const cloudinary = require("../config/cloudinaryConfig");
const emailServices = require("../utils/emailServices");
const { initiatePaypalPayment } = require("./paymentsRoute");

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
});

const uploadToCloudinary = (file, folder) =>
  new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ resource_type: "auto", folder }, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      })
      .end(file.buffer);
  });

const parseJsonField = (value, fallback = []) => {
  if (!value) return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const toSlug = (text) =>
  text
    ?.toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// ==========================================
// PUBLIC / USER EVENT ENDPOINTS
// ==========================================

// Get all active events
router.get("/get-all-events", async (req, res) => {
  try {
    const { status, eventType, featured, search } = req.query;
    const filter = { isActive: true, status: { $ne: "DRAFT" } };

    if (status) filter.status = status;
    if (eventType) filter.eventType = eventType;
    if (featured === "true") filter.isFeatured = true;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
        { venue: { $regex: search, $options: "i" } },
      ];
    }

    const events = await Event.find(filter).sort({ startDate: 1 });
    res.json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single event by ID or slug (includes shareUrl for social media sharing)
router.get("/get-event/:idOrSlug", async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    const query = mongoose.Types.ObjectId.isValid(idOrSlug)
      ? { _id: idOrSlug }
      : { slug: idOrSlug.toLowerCase() };

    const event = await Event.findOne(query);
    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    res.json({
      success: true,
      data: {
        ...event.toObject(),
        shareUrl: `${FRONTEND_URL}/events/${event.slug}`,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// USER TICKET PURCHASE ENDPOINTS (PAYPAL READY)
// ==========================================

// Purchase event tickets
router.post("/purchase-ticket", authMiddleware, async (req, res) => {
  const { eventId, tickets: requestedTickets, attendeeName, email, phone } =
    req.body;
  const userId = req.user.userId;

  if (
    !eventId ||
    !Array.isArray(requestedTickets) ||
    requestedTickets.length === 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Event ID and at least one ticket selection are required",
    });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const event = await Event.findById(eventId).session(session);
    if (!event || !event.isActive) {
      throw new Error("Event not found or unavailable");
    }
    if (event.status === "SOLD OUT" || event.status === "CANCELLED") {
      throw new Error(`Tickets are unavailable (${event.status})`);
    }

    const purchasedItems = [];
    let totalAmount = 0;
    let currency = "USD";

    for (const item of requestedTickets) {
      const tier = event.ticketTiers.id(item.tierId);
      if (!tier || !tier.isActive) {
        throw new Error("Selected ticket tier is unavailable");
      }

      const qty = Number(item.quantity || 1);
      if (qty < 1) {
        throw new Error("Ticket quantity must be at least 1");
      }

      const remaining = tier.totalQuantity - tier.soldQuantity;
      if (remaining < qty) {
        throw new Error(
          `Only ${remaining} ticket(s) remaining for ${tier.name}`
        );
      }

      tier.soldQuantity += qty;
      const subtotal = Number((tier.price * qty).toFixed(2));
      totalAmount += subtotal;
      currency = tier.currency || "USD";

      purchasedItems.push({
        tierId: tier._id,
        tierName: tier.name,
        unitPrice: tier.price,
        quantity: qty,
        subtotal,
      });
    }

    // Auto-update event status to SOLD OUT if all active tiers are sold out
    const anyAvailable = event.ticketTiers.some(
      (t) => t.isActive && t.totalQuantity - t.soldQuantity > 0
    );
    if (!anyAvailable && event.ticketTiers.length > 0) {
      event.status = "SOLD OUT";
    }

    await event.save({ session });

    const userDoc = await User.findById(userId).session(session);
    const resolvedEmail = (email || userDoc?.email || "").trim().toLowerCase();
    const resolvedName =
      attendeeName ||
      `${userDoc?.firstName || ""} ${userDoc?.lastName || ""}`.trim() ||
      "Guest";

    const txRef = `wiz_tkt_${Date.now()}`;

    const ticketOrder = new TicketOrder({
      event: event._id,
      user: userId,
      attendeeName: resolvedName,
      email: resolvedEmail,
      phone: phone || userDoc?.phoneNumber || "",
      tickets: purchasedItems,
      totalAmount: Number(totalAmount.toFixed(2)),
      currency,
      transactionRef: txRef,
      paymentMethod: "paypal",
      paymentStatus: "pending",
      status: "Processing",
    });

    await ticketOrder.save({ session });

    await new Activity({
      user: userId,
      action: "TICKET_PURCHASED",
      details: `Reserved ticket(s) for ${event.title} (${ticketOrder.ticketCode})`,
      ipAddress: req.ip,
    }).save({ session });

    await session.commitTransaction();
    session.endSession();

    const paymentResponse = await initiatePaypalPayment(
      ticketOrder.totalAmount,
      ticketOrder.currency,
      ticketOrder._id
    );

    // Notify User
    const userNotification = new Notification({
      user: userId,
      title: "Ticket Reservation Created",
      description: `Your ticket (${ticketOrder.ticketCode}) for ${event.title} is awaiting payment confirmation.`,
      type: "event",
      onClick: `/events/${event.slug}`,
    });
    await userNotification.save();
    if (req.io) {
      req.io.to(userId.toString()).emit("new-notification", userNotification);
    }

    // Notify Admins
    const admins = await User.find({ role: "admin" });
    for (const admin of admins) {
      const adminNotif = new Notification({
        user: admin._id,
        title: "New Event Ticket Order",
        description: `${resolvedName} reserved tickets ($${ticketOrder.totalAmount.toFixed(
          2
        )}) for ${event.title}`,
        type: "event",
        onClick: "/admin/events",
      });
      await adminNotif.save();
      if (req.io) {
        req.io.to(admin._id.toString()).emit("new-notification", adminNotif);
      }
    }

    await emailServices.sendTicketConfirmation(
      resolvedEmail,
      ticketOrder,
      event
    );
    await emailServices.sendAdminTicketNotification(ticketOrder, event);

    res.status(201).json({
      success: true,
      message: "Ticket order created successfully",
      data: {
        ticketOrder,
        payment: paymentResponse,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ success: false, message: error.message });
  }
});

// PayPal ticket payment confirmation callback (Placeholder until PayPal SDK is wired)
router.post("/confirm-ticket-payment", authMiddleware, async (req, res) => {
  try {
    const { ticketOrderId, paypalOrderId, transactionId } = req.body;
    const ticketOrder = await TicketOrder.findById(ticketOrderId).populate(
      "event"
    );

    if (!ticketOrder) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket order not found" });
    }

    ticketOrder.paymentStatus = "completed";
    ticketOrder.status = "Confirmed";
    ticketOrder.paypalOrderId = paypalOrderId || ticketOrder.paypalOrderId;
    ticketOrder.transaction_id = transactionId || ticketOrder.transaction_id;
    await ticketOrder.save();

    res.json({
      success: true,
      message: "Ticket payment confirmed",
      data: ticketOrder,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// User: Get my purchased event tickets
router.get("/my-tickets", authMiddleware, async (req, res) => {
  try {
    const tickets = await TicketOrder.find({ user: req.user.userId })
      .populate(
        "event",
        "title slug venue location startDate endDate dateLabel time flyerUrl"
      )
      .sort({ createdAt: -1 });

    res.json({ success: true, data: tickets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// ADMIN EVENTS CRUD & TICKET SALES MANAGEMENT
// ==========================================

// Admin: Create Event
router.post(
  "/admin/create",
  authMiddleware,
  adminMiddleware,
  upload.fields([{ name: "flyer", maxCount: 1 }]),
  async (req, res) => {
    try {
      const {
        title,
        slug,
        description,
        startDate,
        endDate,
        dateLabel,
        time,
        venue,
        location,
        mapEmbedUrl,
        latitude,
        longitude,
        eventType,
        status,
        websiteUrl,
        organizedBy,
        flyerUrl,
        artists,
        ticketTiers,
        isFeatured,
        isActive,
      } = req.body;

      if (!title || !description || !startDate || !venue || !location) {
        return res.status(400).json({
          success: false,
          message:
            "title, description, startDate, venue, and location are required",
        });
      }

      let resolvedFlyerUrl = flyerUrl || "";
      const flyerFile = req.files?.flyer?.[0];
      if (flyerFile) {
        const uploadRes = await uploadToCloudinary(
          flyerFile,
          "wizolingo/event-flyers"
        );
        resolvedFlyerUrl = uploadRes.secure_url;
      }

      const baseSlug = toSlug(slug || title);
      const existingSlug = await Event.findOne({ slug: baseSlug });
      const finalSlug = existingSlug
        ? `${baseSlug}-${Date.now().toString().slice(-4)}`
        : baseSlug;

      const newEvent = new Event({
        title,
        slug: finalSlug,
        description,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : undefined,
        dateLabel: dateLabel || "",
        time: time || "",
        venue,
        location,
        mapEmbedUrl: mapEmbedUrl || "",
        latitude: latitude !== undefined ? Number(latitude) : undefined,
        longitude: longitude !== undefined ? Number(longitude) : undefined,
        eventType: eventType || "CONCERT",
        status: status || "UPCOMING",
        websiteUrl: websiteUrl || "",
        organizedBy: organizedBy || "Wizolingo Music",
        flyerUrl: resolvedFlyerUrl,
        artists: parseJsonField(artists, []),
        ticketTiers: parseJsonField(ticketTiers, []),
        isFeatured: isFeatured === "true" || isFeatured === true,
        isActive: isActive !== undefined ? isActive === "true" || isActive === true : true,
        createdBy: req.user.userId,
      });

      await newEvent.save();

      res.status(201).json({
        success: true,
        message: "Event created successfully",
        data: newEvent,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Admin: Get all events (including drafts & inactive)
router.get(
  "/admin/all-events",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const events = await Event.find().sort({ createdAt: -1 });
      res.json({ success: true, data: events });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Admin: Update Event (details, embedded map, artists lineup, ticket tiers/pricing)
router.put(
  "/admin/update/:id",
  authMiddleware,
  adminMiddleware,
  upload.fields([{ name: "flyer", maxCount: 1 }]),
  async (req, res) => {
    try {
      const event = await Event.findById(req.params.id);
      if (!event) {
        return res
          .status(404)
          .json({ success: false, message: "Event not found" });
      }

      const updateFields = { ...req.body };

      if (req.files?.flyer?.[0]) {
        const uploadRes = await uploadToCloudinary(
          req.files.flyer[0],
          "wizolingo/event-flyers"
        );
        updateFields.flyerUrl = uploadRes.secure_url;
      }

      if (updateFields.artists !== undefined) {
        updateFields.artists = parseJsonField(updateFields.artists, []);
      }
      if (updateFields.ticketTiers !== undefined) {
        updateFields.ticketTiers = parseJsonField(updateFields.ticketTiers, []);
      }
      if (updateFields.startDate) {
        updateFields.startDate = new Date(updateFields.startDate);
      }
      if (updateFields.endDate) {
        updateFields.endDate = new Date(updateFields.endDate);
      }
      if (updateFields.slug) {
        updateFields.slug = toSlug(updateFields.slug);
      }
      if (updateFields.isFeatured !== undefined) {
        updateFields.isFeatured =
          updateFields.isFeatured === "true" || updateFields.isFeatured === true;
      }
      if (updateFields.isActive !== undefined) {
        updateFields.isActive =
          updateFields.isActive === "true" || updateFields.isActive === true;
      }

      const updatedEvent = await Event.findByIdAndUpdate(
        req.params.id,
        updateFields,
        { new: true }
      );

      res.json({
        success: true,
        message: "Event updated successfully",
        data: updatedEvent,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Admin: Delete Event
router.delete(
  "/admin/delete/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const deleted = await Event.findByIdAndDelete(req.params.id);
      if (!deleted) {
        return res
          .status(404)
          .json({ success: false, message: "Event not found" });
      }
      res.json({ success: true, message: "Event deleted successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Admin: Get all ticket orders & sales summary
router.get(
  "/admin/ticket-orders",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { eventId, status } = req.query;
      const filter = {};
      if (eventId) filter.event = eventId;
      if (status) filter.status = status;

      const orders = await TicketOrder.find(filter)
        .populate("event", "title slug venue location startDate")
        .populate("user", "firstName lastName email")
        .sort({ createdAt: -1 });

      const totalRevenue = orders
        .filter((o) => o.status !== "Cancelled")
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

      const totalTicketsSold = orders
        .filter((o) => o.status !== "Cancelled")
        .reduce(
          (sum, o) =>
            sum + o.tickets.reduce((tSum, t) => tSum + (t.quantity || 0), 0),
          0
        );

      res.json({
        success: true,
        summary: {
          totalOrders: orders.length,
          totalTicketsSold,
          totalRevenue: Number(totalRevenue.toFixed(2)),
        },
        data: orders,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Admin: Update ticket order status (restores inventory if cancelled)
router.put(
  "/admin/update-ticket-status/:orderId",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { status, paymentStatus } = req.body;
      const ticketOrder = await TicketOrder.findById(req.params.orderId);
      if (!ticketOrder) {
        return res
          .status(404)
          .json({ success: false, message: "Ticket order not found" });
      }

      const previousStatus = ticketOrder.status;
      if (status) ticketOrder.status = status;
      if (paymentStatus) ticketOrder.paymentStatus = paymentStatus;
      if (status === "Confirmed") {
        ticketOrder.paymentStatus = "completed";
      }

      // Restore soldQuantity if transitioning into Cancelled
      if (previousStatus !== "Cancelled" && status === "Cancelled") {
        const event = await Event.findById(ticketOrder.event);
        if (event) {
          for (const item of ticketOrder.tickets) {
            const tier = event.ticketTiers.id(item.tierId);
            if (tier) {
              tier.soldQuantity = Math.max(0, tier.soldQuantity - item.quantity);
            }
          }
          if (event.status === "SOLD OUT") {
            event.status = "ON SALE";
          }
          await event.save();
        }
      }

      await ticketOrder.save();

      res.json({
        success: true,
        message: "Ticket order updated successfully",
        data: ticketOrder,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

module.exports = router;

