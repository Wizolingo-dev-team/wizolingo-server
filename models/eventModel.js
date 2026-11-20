// models/eventModel.js
const mongoose = require("mongoose");

const showTimeSchema = new mongoose.Schema(
  {
    time: { type: String, required: true, trim: true }, // e.g. "10:00 PM"
    timezone: { type: String, default: "", trim: true }, // e.g. "WAT", "CET", "GMT", "EST"
    label: { type: String, default: "", trim: true }, // e.g. "Early Show", "Main Set", "Doors Open"
  },
  { _id: true }
);

const eventArtistSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    stage: { type: String, default: "Main stage", trim: true },
    performanceTime: { type: String, default: "", trim: true },
    timezone: { type: String, default: "", trim: true },
    showTimes: { type: [showTimeSchema], default: [] },
    imageUrl: { type: String, default: "" },
  },
  { _id: true }
);

const ticketTierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // e.g. "General Admission", "VIP", "VVIP"
    description: { type: String, default: "", trim: true },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "USD" },
    totalQuantity: { type: Number, required: true, min: 0 },
    soldQuantity: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { _id: true }
);

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: { type: String, required: true, maxLength: 5000 },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    dateLabel: { type: String, default: "", trim: true }, // e.g. "22/08/2024 TO 22/03/2028"
    time: { type: String, default: "", trim: true }, // e.g. "10 PM"
    timezone: { type: String, default: "", trim: true }, // e.g. "WAT", "CET", "GMT", "EST"
    showTimes: { type: [showTimeSchema], default: [] },
    venue: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true }, // e.g. "LONDON, ENGLAND"
    mapEmbedUrl: { type: String, default: "", trim: true }, // Admin-embedded Google Map URL/iframe src
    latitude: { type: Number },
    longitude: { type: Number },
    eventType: { type: String, default: "CONCERT", trim: true }, // e.g. "NEW", "TOUR", "CONCERT"
    status: {
      type: String,
      enum: ["UPCOMING", "ON SALE", "SOLD OUT", "PAST SHOW", "CANCELLED", "DRAFT"],
      default: "UPCOMING",
    },
    websiteUrl: { type: String, default: "", trim: true },
    organizedBy: {
      type: String,
      default: "Wizolingo Music",
      trim: true,
    },
    flyerUrl: { type: String, default: "" },
    artists: {
      type: [eventArtistSchema],
      default: [],
    },
    ticketTiers: {
      type: [ticketTierSchema],
      default: [],
    },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("events", eventSchema);

