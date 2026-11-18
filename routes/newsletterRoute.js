// routes/newsletterRoute.js
const express = require("express");
const router = express.Router();
const NewsletterSubscriber = require("../models/newsletterSubscriberModel");
const NewsletterTemplate = require("../models/newsletterTemplateModel");
const User = require("../models/userModel");
const Notification = require("../models/notificationsModel");
const Activity = require("../models/activityModel");
const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");
const emailServices = require("../utils/emailServices");

// ==========================================
// PUBLIC / USER NEWSLETTER APIs
// ==========================================

// Subscribe to newsletter (replaces Mailchimp in wizoling-website)
router.post("/subscribe", async (req, res) => {
  try {
    const { email, name, source } = req.body;
    if (!email || !email.includes("@")) {
      return res
        .status(400)
        .json({ success: false, message: "Please provide a valid email." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    let subscriber = await NewsletterSubscriber.findOne({
      email: normalizedEmail,
    });

    if (subscriber) {
      if (subscriber.status === "subscribed") {
        return res.status(200).json({
          success: true,
          message: "You are already subscribed to the Wiz Ofuasia newsletter!",
          data: subscriber,
        });
      }

      // Re-subscribe previously unsubscribed user
      subscriber.status = "subscribed";
      subscriber.subscribedAt = new Date();
      subscriber.unsubscribedAt = undefined;
      if (name) subscriber.name = name;
      if (source) subscriber.source = source;
      await subscriber.save();
    } else {
      subscriber = new NewsletterSubscriber({
        email: normalizedEmail,
        name: name || "",
        source: source || "popup",
        status: "subscribed",
      });
      await subscriber.save();
    }

    // Send welcome email via Resend
    await emailServices.sendNewsletterWelcome(
      subscriber.email,
      subscriber.unsubscribeToken
    );

    // Notify Admins in-app
    const admins = await User.find({ role: "admin" }).select("_id");
    for (const admin of admins) {
      const notif = new Notification({
        user: admin._id,
        title: "New Newsletter Subscriber",
        description: `${subscriber.email} joined the Wizolingo Inner Circle.`,
        type: "newsletter",
        onClick: "/admin/newsletter",
      });
      await notif.save();
      if (req.io) {
        req.io.to(admin._id.toString()).emit("new-notification", notif);
      }
    }

    res.status(201).json({
      success: true,
      message: "Welcome to Wiz Ofuasia's inner circle! You're subscribed.",
      data: subscriber,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Unsubscribe from newsletter (via token or email)
router.post("/unsubscribe", async (req, res) => {
  try {
    const { email, token } = req.body;
    const query = token
      ? { unsubscribeToken: token }
      : { email: email?.trim().toLowerCase() };

    const subscriber = await NewsletterSubscriber.findOne(query);
    if (!subscriber) {
      return res
        .status(404)
        .json({ success: false, message: "Subscriber not found" });
    }

    subscriber.status = "unsubscribed";
    subscriber.unsubscribedAt = new Date();
    await subscriber.save();

    res.json({
      success: true,
      message: "You have been unsubscribed from the newsletter.",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// ADMIN NEWSLETTER SUBSCRIBERS CRUD
// ==========================================

// Admin: Get all subscribers
router.get(
  "/admin/subscribers",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { status, search } = req.query;
      const filter = {};
      if (status) filter.status = status;
      if (search) {
        filter.email = { $regex: search, $options: "i" };
      }

      const subscribers = await NewsletterSubscriber.find(filter).sort({
        createdAt: -1,
      });

      res.json({
        success: true,
        count: subscribers.length,
        data: subscribers,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Admin: Add subscriber manually
router.post(
  "/admin/subscribers",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { email, name, status } = req.body;
      if (!email) {
        return res
          .status(400)
          .json({ success: false, message: "Email is required" });
      }

      const subscriber = new NewsletterSubscriber({
        email: email.trim().toLowerCase(),
        name: name || "",
        source: "admin",
        status: status || "subscribed",
      });
      await subscriber.save();

      res.status(201).json({
        success: true,
        message: "Subscriber added successfully",
        data: subscriber,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Admin: Update subscriber
router.put(
  "/admin/subscribers/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const updated = await NewsletterSubscriber.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );
      if (!updated) {
        return res
          .status(404)
          .json({ success: false, message: "Subscriber not found" });
      }
      res.json({
        success: true,
        message: "Subscriber updated successfully",
        data: updated,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Admin: Delete subscriber
router.delete(
  "/admin/subscribers/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const deleted = await NewsletterSubscriber.findByIdAndDelete(
        req.params.id
      );
      if (!deleted) {
        return res
          .status(404)
          .json({ success: false, message: "Subscriber not found" });
      }
      res.json({ success: true, message: "Subscriber deleted successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ==========================================
// ADMIN NEWSLETTER TEMPLATES CRUD & CAMPAIGNS
// ==========================================

// Admin: Create Newsletter Template
router.post(
  "/admin/templates",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { name, subject, previewText, category, htmlContent, designJson } =
        req.body;

      if (!name || !subject || !htmlContent) {
        return res.status(400).json({
          success: false,
          message: "Name, subject, and htmlContent are required",
        });
      }

      const template = new NewsletterTemplate({
        name,
        subject,
        previewText: previewText || "",
        category: category || "general",
        htmlContent,
        designJson: designJson || null,
        createdBy: req.user.userId,
      });

      await template.save();

      res.status(201).json({
        success: true,
        message: "Newsletter template created successfully",
        data: template,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Admin: Get All Newsletter Templates
router.get(
  "/admin/templates",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const templates = await NewsletterTemplate.find()
        .populate("createdBy", "firstName lastName email")
        .sort({ createdAt: -1 });

      res.json({ success: true, data: templates });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Admin: Get Single Newsletter Template
router.get(
  "/admin/templates/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const template = await NewsletterTemplate.findById(req.params.id);
      if (!template) {
        return res
          .status(404)
          .json({ success: false, message: "Template not found" });
      }
      res.json({ success: true, data: template });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Admin: Update Newsletter Template
router.put(
  "/admin/templates/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const updated = await NewsletterTemplate.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );
      if (!updated) {
        return res
          .status(404)
          .json({ success: false, message: "Template not found" });
      }
      res.json({
        success: true,
        message: "Newsletter template updated successfully",
        data: updated,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Admin: Delete Newsletter Template
router.delete(
  "/admin/templates/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const deleted = await NewsletterTemplate.findByIdAndDelete(req.params.id);
      if (!deleted) {
        return res
          .status(404)
          .json({ success: false, message: "Template not found" });
      }
      res.json({
        success: true,
        message: "Newsletter template deleted successfully",
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Admin: Send Newsletter Campaign from Template (or send test email)
router.post(
  "/admin/templates/:id/send",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { testEmail } = req.body;
      const template = await NewsletterTemplate.findById(req.params.id);
      if (!template) {
        return res
          .status(404)
          .json({ success: false, message: "Template not found" });
      }

      if (testEmail) {
        await emailServices.sendNewsletterCampaign(
          testEmail,
          `[TEST] ${template.subject}`,
          template.htmlContent,
          "test-token"
        );
        return res.json({
          success: true,
          message: `Test newsletter sent to ${testEmail}`,
        });
      }

      const activeSubscribers = await NewsletterSubscriber.find({
        status: "subscribed",
      });

      if (activeSubscribers.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No active subscribers found",
        });
      }

      let sentCount = 0;
      for (const subscriber of activeSubscribers) {
        await emailServices.sendNewsletterCampaign(
          subscriber.email,
          template.subject,
          template.htmlContent,
          subscriber.unsubscribeToken
        );
        sentCount += 1;
      }

      template.status = "sent";
      template.sentCount += sentCount;
      template.lastSentAt = new Date();
      await template.save();

      await new Activity({
        user: req.user.userId,
        action: "NEWSLETTER_SENT",
        details: `Sent newsletter "${template.name}" to ${sentCount} subscriber(s)`,
        ipAddress: req.ip,
      }).save();

      res.json({
        success: true,
        message: `Newsletter sent to ${sentCount} subscriber(s)`,
        data: template,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

module.exports = router;

