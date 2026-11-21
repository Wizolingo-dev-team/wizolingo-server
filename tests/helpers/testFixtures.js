// tests/helpers/testFixtures.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../../models/userModel");

const createMockIo = () => {
  const emit = vi.fn();
  const to = vi.fn().mockReturnValue({ emit });
  return { to, emit };
};

const createUserWithToken = async (overrides = {}) => {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(
    overrides.password || "Password123",
    salt
  );

  const user = await User.create({
    firstName: overrides.firstName || "Wiz",
    lastName: overrides.lastName || "Fan",
    email:
      overrides.email ||
      `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@example.com`,
    password: hashedPassword,
    role: overrides.role || "user",
    isVerified: overrides.isVerified !== undefined ? overrides.isVerified : true,
    phoneNumber: overrides.phoneNumber || "08012345678",
    address: overrides.address || "12 Lagos Way",
  });

  const token = jwt.sign(
    { userId: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  return { user, token };
};

const createAdminWithToken = async (overrides = {}) => {
  return createUserWithToken({
    firstName: "Admin",
    lastName: "Wiz",
    role: "admin",
    isVerified: true,
    ...overrides,
  });
};

module.exports = {
  createMockIo,
  createUserWithToken,
  createAdminWithToken,
};

