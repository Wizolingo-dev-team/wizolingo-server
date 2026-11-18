// models/newsletterTemplateModel.js
const mongoose = require("mongoose");

const newsletterTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    previewText: {
      type: String,
      trim: true,
      default: "",
    },
    category: {
      type: String,
      enum: ["release", "tour", "merch", "general"],
      default: "general",
    },
    htmlContent: {
      type: String,
      required: true,
    },
    designJson: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    status: {
      type: String,
      enum: ["draft", "sent"],
      default: "draft",
    },
    sentCount: {
      type: Number,
      default: 0,
    },
    lastSentAt: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("newsletterTemplates", newsletterTemplateSchema);

