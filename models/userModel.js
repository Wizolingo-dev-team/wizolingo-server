// models/userModel.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true, maxLength: 32 },
    lastName: { type: String, required: true, trim: true, maxLength: 32 },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    phoneNumber: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
    password: { type: String, required: true, min: 6, max: 64 },
    avatar: {
      public_id: { type: String, default: "default" },
      url: { type: String, default: "" },
    },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isVerified: { type: Boolean, default: false },
    otp: String,
    otpExpires: Date,
    resetPasswordToken: { type: String, required: false },
    resetPasswordExpires: { type: Date, required: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

userSchema.virtual("wishlists", {
  ref: "wishlists",
  localField: "_id",
  foreignField: "user",
  justOne: true,
});

userSchema.virtual("orders", {
  ref: "orders",
  localField: "_id",
  foreignField: "user",
});

userSchema.virtual("reviews", {
  ref: "reviews",
  localField: "_id",
  foreignField: "user",
});

module.exports = mongoose.model("users", userSchema);

