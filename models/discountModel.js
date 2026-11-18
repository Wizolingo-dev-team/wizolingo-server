// models/discountModel.js
const mongoose = require("mongoose");

const discountSchema = new mongoose.Schema(
  {
    discountCode: {
      type: String,
      required: [true, "Please enter unique Code!"],
      unique: true,
      uppercase: true,
      trim: true,
    },
    discountPercentage: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
    },
    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "products",
      },
    ],
    expiryDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("discounts", discountSchema);

