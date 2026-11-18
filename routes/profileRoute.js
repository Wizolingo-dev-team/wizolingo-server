// routes/profileRoute.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/userModel");
const Activity = require("../models/activityModel");
const authMiddleware = require("../middlewares/authMiddleware");
const cloudinary = require("../config/cloudinaryConfig");

module.exports = (upload) => {
  // Get current user profile
  router.get("/", authMiddleware, async (req, res) => {
    try {
      const user = await User.findById(req.user.userId).select("-password");
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }
      res.json({ success: true, data: user });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Update profile
  router.put(
    "/update",
    authMiddleware,
    upload.single("avatar"),
    async (req, res) => {
      try {
        const { firstName, lastName, phoneNumber, address } = req.body;
        const user = await User.findById(req.user.userId);
        if (!user) {
          return res
            .status(404)
            .json({ success: false, message: "User not found" });
        }

        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
        if (address !== undefined) user.address = address;

        if (req.file) {
          const uploadResult = await new Promise((resolve, reject) => {
            cloudinary.uploader
              .upload_stream(
                { folder: "wizolingo/user-avatars" },
                (error, result) => {
                  if (error) reject(error);
                  else resolve(result);
                }
              )
              .end(req.file.buffer);
          });
          user.avatar = {
            public_id: uploadResult.public_id,
            url: uploadResult.secure_url,
          };
        }

        await user.save();

        await new Activity({
          user: user._id,
          action: "PROFILE_UPDATED",
          details: "Updated account profile details",
          ipAddress: req.ip,
        }).save();

        const updatedUser = user.toObject();
        delete updatedUser.password;

        res.json({
          success: true,
          message: "Profile updated successfully",
          data: updatedUser,
        });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    }
  );

  // Change password
  router.put("/change-password", authMiddleware, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword || newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: "New password must be at least 6 characters long",
        });
      }

      const user = await User.findById(req.user.userId);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res
          .status(400)
          .json({ success: false, message: "Current password is incorrect" });
      }

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
      await user.save();

      await new Activity({
        user: user._id,
        action: "PASSWORD_CHANGED",
        details: "Changed account password",
        ipAddress: req.ip,
      }).save();

      res.json({ success: true, message: "Password changed successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  return router;
};

