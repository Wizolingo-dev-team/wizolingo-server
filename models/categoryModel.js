// models/categoryModel.js
const mongoose = require("mongoose");

const subcategorySchema = new mongoose.Schema(
  {
    subcategoryName: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

const categorySchema = new mongoose.Schema(
  {
    categoryName: {
      type: String,
      required: true,
      trim: true,
    },
    categoryType: {
      type: String,
      enum: ["merch", "digital_music", "general"],
      default: "general",
    },
    subcategories: [subcategorySchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", categorySchema);

