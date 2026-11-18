// routes/usersRoute.js
const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/userModel");
const Review = require("../models/reviewModel");
const Activity = require("../models/activityModel");
const Notification = require("../models/notificationsModel");
const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");
const cloudinary = require("../config/cloudinaryConfig");
const emailServices = require("../utils/emailServices");
const { generateOTP } = require("../utils/otpGenerator");

const uploadBufferToCloudinary = (buffer, folder) =>
  new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder }, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      })
      .end(buffer);
  });

module.exports = (upload) => {
  // User Registration
  router.post("/register", upload.single("avatar"), async (req, res) => {
    try {
      const { firstName, lastName, email, password, phoneNumber, address } =
        req.body;
      const avatar = req.file;

      if (
        !firstName ||
        !lastName ||
        !email ||
        !password ||
        password.length < 6
      ) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid input fields" });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const userExists = await User.findOne({ email: normalizedEmail });
      if (userExists) {
        return res
          .status(400)
          .json({ success: false, message: "User already exists" });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      let avatarData = { public_id: "default", url: "" };
      if (avatar) {
        const avatarUploadResponse = await uploadBufferToCloudinary(
          avatar.buffer,
          "wizolingo/user-avatars"
        );
        avatarData = {
          public_id: avatarUploadResponse.public_id,
          url: avatarUploadResponse.secure_url,
        };
      }

      const otp = generateOTP();
      const otpExpires = Date.now() + 10 * 60 * 1000;

      const user = new User({
        firstName,
        lastName,
        email: normalizedEmail,
        password: hashedPassword,
        phoneNumber: phoneNumber || "",
        address: address || "",
        avatar: avatarData,
        otp,
        otpExpires,
      });

      await user.save();
      await emailServices.sendOTP(normalizedEmail, otp);

      res.status(201).json({
        success: true,
        message:
          "Registration successful. Please check your email for the verification OTP.",
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Verify Email OTP
  router.post("/verify-email", async (req, res) => {
    try {
      const { email, otp } = req.body;
      const normalizedEmail = email?.trim().toLowerCase();

      const user = await User.findOne({
        email: normalizedEmail,
        otp,
        otpExpires: { $gt: Date.now() },
      });

      if (!user) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid or expired OTP" });
      }

      user.isVerified = true;
      user.otp = undefined;
      user.otpExpires = undefined;
      await user.save();

      await emailServices.sendWelcome(user.email, user.firstName);

      // Welcome in-app notification
      const welcomeNotification = new Notification({
        user: user._id,
        title: "Welcome to Wizolingo!",
        description:
          "Your account is verified. Explore official Wiz Ofuasia music downloads and merch.",
        type: "auth",
        onClick: "/songs",
      });
      await welcomeNotification.save();
      if (req.io) {
        req.io
          .to(user._id.toString())
          .emit("new-notification", welcomeNotification);
      }

      res.send({
        success: true,
        message: "Email verified successfully. You can now login.",
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // User Login
  router.post("/login", async (req, res) => {
    try {
      const normalizedEmail = req.body.email?.trim().toLowerCase();
      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        return res
          .status(404)
          .send({ success: false, message: "User does not exist" });
      }
      if (!user.isVerified) {
        return res
          .status(403)
          .send({ success: false, message: "Please verify your email first" });
      }

      const passwordCorrect = await bcrypt.compare(
        req.body.password,
        user.password
      );
      if (!passwordCorrect) {
        return res
          .status(401)
          .send({ success: false, message: "Wrong credentials!" });
      }

      const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      await new Activity({
        user: user._id,
        action: "LOGIN",
        details: "User logged in successfully",
        ipAddress: req.ip,
      }).save();

      res.send({
        success: true,
        data: token,
        message: "Logged in successfully",
      });
    } catch (error) {
      res.status(500).send({ success: false, message: error.message });
    }
  });

  // Get Logged-in User
  router.get("/get-logged-in-user", authMiddleware, async (req, res) => {
    try {
      const user = await User.findById(req.user.userId)
        .populate("orders")
        .populate("wishlists")
        .select("-password");

      if (!user) {
        return res
          .status(404)
          .send({ success: false, message: "User not found" });
      }

      res.send({
        success: true,
        data: user,
        message: "User retrieved successfully",
      });
    } catch (error) {
      res.status(500).send({ success: false, message: error.message });
    }
  });

  // Forgot Password
  router.post("/forgot-password", async (req, res) => {
    try {
      const normalizedEmail = req.body.email?.trim().toLowerCase();
      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      const token = crypto.randomBytes(20).toString("hex");
      user.resetPasswordToken = token;
      user.resetPasswordExpires = Date.now() + 3600000;
      await user.save();

      await emailServices.sendPasswordReset(normalizedEmail, token);
      res
        .status(200)
        .json({ success: true, message: "Password reset email sent" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Reset Password
  router.post("/reset-password/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const { password } = req.body;

      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() },
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          message: "Password reset token is invalid or has expired",
        });
      }

      if (!password || password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password should be at least 6 characters long",
        });
      }

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      await new Activity({
        user: user._id,
        action: "PASSWORD_CHANGED",
        details: "Password reset via recovery link",
        ipAddress: req.ip,
      }).save();

      res
        .status(200)
        .json({ success: true, message: "Password has been reset" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Resend User OTP
  router.post("/resend-otp", async (req, res) => {
    try {
      const normalizedEmail = req.body.email?.trim().toLowerCase();
      const user = await User.findOne({ email: normalizedEmail });

      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      if (user.isVerified) {
        return res
          .status(400)
          .json({ success: false, message: "User is already verified" });
      }

      const otp = generateOTP();
      user.otp = otp;
      user.otpExpires = Date.now() + 10 * 60 * 1000;
      await user.save();

      await emailServices.sendOTP(user.email, otp);

      res.status(200).json({
        success: true,
        message: "A new OTP has been sent to your email.",
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Add Product Review
  router.post("/add-review", authMiddleware, async (req, res) => {
    try {
      const { review, rating, productId } = req.body;
      const userId = req.user.userId;

      const newReview = new Review({
        user: userId,
        product: productId,
        review,
        rating,
      });
      await newReview.save();

      res.status(201).send({
        success: true,
        message: "Review added successfully",
        data: newReview,
      });
    } catch (error) {
      res.status(500).send({ success: false, message: error.message });
    }
  });

  // Get Reviews (optionally filtered by productId)
  router.get("/get-reviews", async (req, res) => {
    try {
      const { productId } = req.query;
      const filter = productId ? { product: productId } : {};

      const reviews = await Review.find(filter)
        .populate({
          path: "user",
          select: "firstName lastName avatar",
        })
        .sort({ createdAt: -1 });

      res.send({ success: true, data: reviews });
    } catch (error) {
      res.status(500).send({ success: false, message: error.message });
    }
  });

  // Admin: Get All Reviews
  router.get(
    "/admin/get-all-reviews",
    authMiddleware,
    adminMiddleware,
    async (req, res) => {
      try {
        const reviews = await Review.find()
          .populate({
            path: "user",
            select: "firstName lastName email avatar",
          })
          .populate({
            path: "product",
            select: "productName productType attachments price",
          })
          .sort({ createdAt: -1 });

        res.send({
          success: true,
          count: reviews.length,
          data: reviews,
          message: "All reviews retrieved successfully",
        });
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    }
  );

  // Admin Login (Step 1: verify password and send Admin OTP via Resend)
  router.post("/admin/login", async (req, res) => {
    try {
      const normalizedEmail = req.body.email?.trim().toLowerCase();
      const user = await User.findOne({ email: normalizedEmail });

      if (!user || user.role !== "admin") {
        return res
          .status(403)
          .json({ success: false, message: "Access denied." });
      }

      const passwordCorrect = await bcrypt.compare(
        req.body.password,
        user.password
      );

      if (!passwordCorrect) {
        return res
          .status(401)
          .json({ success: false, message: "Invalid credentials." });
      }

      const otp = generateOTP();
      user.otp = otp;
      user.otpExpires = Date.now() + 5 * 60 * 1000;
      await user.save();

      await emailServices.sendAdminOTP(user.email, otp);

      res
        .status(200)
        .json({ success: true, message: "Admin OTP sent to your email." });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Admin Login (Step 2: verify OTP and issue admin JWT)
  router.post("/admin/verify-login", async (req, res) => {
    try {
      const { email, otp } = req.body;
      const normalizedEmail = email?.trim().toLowerCase();

      const user = await User.findOne({
        email: normalizedEmail,
        otp,
        role: "admin",
        otpExpires: { $gt: Date.now() },
      });

      if (!user) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid or expired OTP" });
      }

      const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      user.otp = undefined;
      user.otpExpires = undefined;
      await user.save();

      await new Activity({
        user: user._id,
        action: "ADMIN_LOGIN",
        details: "Admin logged in successfully via OTP",
        ipAddress: req.ip,
      }).save();

      res
        .status(200)
        .json({ success: true, data: token, message: "Welcome Admin" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Admin Resend OTP
  router.post("/admin/resend-otp", async (req, res) => {
    try {
      const normalizedEmail = req.body.email?.trim().toLowerCase();
      const user = await User.findOne({ email: normalizedEmail, role: "admin" });

      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "Admin not found" });
      }

      const otp = generateOTP();
      user.otp = otp;
      user.otpExpires = Date.now() + 5 * 60 * 1000;
      await user.save();

      await emailServices.sendAdminOTP(user.email, otp);

      res
        .status(200)
        .json({ success: true, message: "New OTP sent to admin's email." });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Admin: Get All Users
  router.get(
    "/admin/all-users",
    authMiddleware,
    adminMiddleware,
    async (req, res) => {
      try {
        const users = await User.find()
          .populate("orders")
          .populate("wishlists")
          .select("-password")
          .sort({ createdAt: -1 });

        const usersWithCounts = users.map((user) => {
          const userObj = user.toObject();
          return {
            ...userObj,
            orderCount: (userObj.orders || []).length,
            wishlistCount: userObj.wishlists
              ? (userObj.wishlists.products || []).length
              : 0,
          };
        });

        res.send({
          success: true,
          data: usersWithCounts,
          message: "Users retrieved successfully",
        });
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    }
  );

  // Admin: Update User Role
  router.put(
    "/admin/update-user-role/:id",
    authMiddleware,
    adminMiddleware,
    async (req, res) => {
      try {
        const { role } = req.body;
        const targetUserId = req.params.id;
        const adminId = req.user.userId;

        if (!["user", "admin"].includes(role)) {
          return res
            .status(400)
            .send({ success: false, message: "Invalid role." });
        }

        if (targetUserId === adminId && role === "user") {
          return res
            .status(400)
            .send({ success: false, message: "You cannot demote yourself." });
        }

        const updatedUser = await User.findByIdAndUpdate(
          targetUserId,
          { role },
          { new: true }
        )
          .populate("orders")
          .populate("wishlists")
          .select("-password");

        if (!updatedUser) {
          return res
            .status(404)
            .send({ success: false, message: "User not found" });
        }

        const userObj = updatedUser.toObject();
        const formattedUser = {
          ...userObj,
          orderCount: (userObj.orders || []).length,
          wishlistCount: userObj.wishlists
            ? (userObj.wishlists.products || []).length
            : 0,
        };

        res.send({
          success: true,
          data: formattedUser,
          message: "User role updated successfully",
        });
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    }
  );

  return router;
};

