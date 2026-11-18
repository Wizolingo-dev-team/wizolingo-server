// models/deliveryFeeModel.js
const mongoose = require("mongoose");

const DeliveryFeeSchema = new mongoose.Schema(
  {
    country: { type: String, required: true, trim: true, lowercase: true },
    states: [
      {
        state: { type: String, required: true, lowercase: true, trim: true },
        fee: { type: Number, required: true },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("deliveryFees", DeliveryFeeSchema);

