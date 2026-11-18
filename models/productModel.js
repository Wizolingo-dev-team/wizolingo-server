// models/productModel.js
const mongoose = require("mongoose");

const digitalFileSchema = new mongoose.Schema(
  {
    fileName: { type: String, required: true, trim: true },
    fileUrl: { type: String, required: true },
    publicId: { type: String, default: "" },
    fileFormat: {
      type: String,
      enum: ["mp3", "wav", "flac", "aac", "zip", "pdf"],
      default: "mp3",
    },
    fileSize: { type: Number, default: 0 },
  },
  { _id: true }
);

const tracklistItemSchema = new mongoose.Schema(
  {
    trackNumber: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    duration: { type: String, default: "" },
    featuredArtists: { type: String, default: "" },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
    },
    productType: {
      type: String,
      enum: ["merch", "digital_music"],
      required: true,
      default: "merch",
    },
    description: {
      type: String,
      required: true,
      maxLength: 5000,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    subcategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    discounts: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "discounts",
    },
    // Merch-specific fields
    quantity: {
      type: Number,
      default: 0,
    },
    color: {
      type: [String],
      default: [],
    },
    size: {
      type: [String],
      default: [],
    },
    shipping: {
      type: Boolean,
      default: true,
    },
    // Digital music download-specific fields (storefront downloads, not streaming)
    digitalReleaseType: {
      type: String,
      enum: ["single", "album", "ep", "instrumental", "stem_pack", ""],
      default: "",
    },
    artist: {
      type: String,
      trim: true,
      default: "Wiz Ofuasia (Wizboyy)",
    },
    releaseDate: {
      type: Date,
    },
    duration: {
      type: String,
      trim: true,
      default: "",
    },
    previewUrl: {
      type: String,
      default: "",
    },
    digitalFiles: {
      type: [digitalFileSchema],
      default: [],
    },
    tracklist: {
      type: [tracklistItemSchema],
      default: [],
    },
    downloadCount: {
      type: Number,
      default: 0,
    },
    // Shared metadata
    sold: {
      type: Number,
      default: 0,
    },
    attachments: {
      type: [String],
      default: [],
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("products", productSchema);

