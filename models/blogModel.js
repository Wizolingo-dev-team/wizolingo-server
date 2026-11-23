// models/blogModel.js
const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    excerpt: {
      type: String,
      trim: true,
      default: "",
    },
    content: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      trim: true,
      default: "Articles",
    },
    author: {
      type: String,
      trim: true,
      default: "Wiz Ofuasia Editorial",
    },
    readTime: {
      type: String,
      trim: true,
      default: "3 min read",
    },
    coverImage: {
      type: String,
      default: "",
    },
    coverImagePublicId: {
      type: String,
      default: "",
    },
    inlineImages: [
      {
        url: { type: String, required: true },
        public_id: { type: String, default: "" },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    tags: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["Draft", "Published"],
      default: "Published",
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    date: {
      type: String,
      default: () =>
        new Date().toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        }),
    },
    isoDate: {
      type: String,
      default: () => new Date().toISOString(),
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    },
  },
  {
    timestamps: true,
  }
);

// Keep status and isPublished in sync
blogSchema.pre("save", function (next) {
  if (this.isModified("status")) {
    this.isPublished = this.status === "Published";
  } else if (this.isModified("isPublished")) {
    this.status = this.isPublished ? "Published" : "Draft";
  }
  next();
});

module.exports = mongoose.model("blogs", blogSchema);

