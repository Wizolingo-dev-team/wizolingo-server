// tests/integration/usersRoute.test.js
const request = require("supertest");
const createApp = require("../../app");
const User = require("../../models/userModel");
const Product = require("../../models/productModel");
const emailServices = require("../../utils/emailServices");
const { connectTestDB, clearTestDB, closeTestDB } = require("../helpers/db");
const {
  createMockIo,
  createUserWithToken,
  createAdminWithToken,
} = require("../helpers/testFixtures");

describe("Integration: /api/users", () => {
  let app;

  beforeAll(async () => {
    await connectTestDB();
    app = createApp(createMockIo());
  });

  beforeEach(async () => {
    await clearTestDB();
    vi.spyOn(emailServices, "sendOTP").mockResolvedValue();
    vi.spyOn(emailServices, "sendAdminOTP").mockResolvedValue();
    vi.spyOn(emailServices, "sendWelcome").mockResolvedValue();
    vi.spyOn(emailServices, "sendPasswordReset").mockResolvedValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  it("registers, verifies OTP, logs in, and retrieves logged-in user", async () => {
    const regRes = await request(app).post("/api/users/register").send({
      firstName: "Ada",
      lastName: "Okafor",
      email: "ada@example.com",
      password: "Password123",
    });
    expect(regRes.status).toBe(201);
    expect(emailServices.sendOTP).toHaveBeenCalledTimes(1);

    const savedUser = await User.findOne({ email: "ada@example.com" });
    expect(savedUser.isVerified).toBe(false);
    expect(savedUser.otp).toMatch(/^\d{6}$/);

    const verifyRes = await request(app).post("/api/users/verify-email").send({
      email: "ada@example.com",
      otp: savedUser.otp,
    });
    expect(verifyRes.status).toBe(200);
    expect(emailServices.sendWelcome).toHaveBeenCalledWith(
      "ada@example.com",
      "Ada"
    );

    const loginRes = await request(app).post("/api/users/login").send({
      email: "ada@example.com",
      password: "Password123",
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data).toBeTruthy();

    const meRes = await request(app)
      .get("/api/users/get-logged-in-user")
      .set("Authorization", `Bearer ${loginRes.body.data}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.email).toBe("ada@example.com");
    expect(meRes.body.data.password).toBeUndefined();
  });

  it("handles forgot-password, reset-password, and resend-otp", async () => {
    await createUserWithToken({
      email: "reset@example.com",
      isVerified: false,
    });

    const resendRes = await request(app)
      .post("/api/users/resend-otp")
      .send({ email: "reset@example.com" });
    expect(resendRes.status).toBe(200);

    const forgotRes = await request(app)
      .post("/api/users/forgot-password")
      .send({ email: "reset@example.com" });
    expect(forgotRes.status).toBe(200);

    const user = await User.findOne({ email: "reset@example.com" });
    const resetRes = await request(app)
      .post(`/api/users/reset-password/${user.resetPasswordToken}`)
      .send({ password: "NewPassword123" });
    expect(resetRes.status).toBe(200);
  });

  it("handles product reviews and admin OTP login + user management", async () => {
    const { user, token: userToken } = await createUserWithToken();
    const { token: adminToken } = await createAdminWithToken({
      email: "admin@wizofuasia.com",
      password: "AdminPassword123",
    });

    const product = await Product.create({
      productName: "Yolo Hoodie",
      productType: "merch",
      description: "Official merch",
      price: 55,
      quantity: 10,
    });

    const addReviewRes = await request(app)
      .post("/api/users/add-review")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ productId: product._id, review: "Amazing quality!", rating: 5 });
    expect(addReviewRes.status).toBe(201);

    const getReviewsRes = await request(app)
      .get(`/api/users/get-reviews?productId=${product._id}`);
    expect(getReviewsRes.status).toBe(200);
    expect(getReviewsRes.body.data).toHaveLength(1);

    // Admin OTP login
    const adminLoginRes = await request(app).post("/api/users/admin/login").send({
      email: "admin@wizofuasia.com",
      password: "AdminPassword123",
    });
    expect(adminLoginRes.status).toBe(200);

    const adminUser = await User.findOne({ email: "admin@wizofuasia.com" });
    const adminVerifyRes = await request(app)
      .post("/api/users/admin/verify-login")
      .send({ email: "admin@wizofuasia.com", otp: adminUser.otp });
    expect(adminVerifyRes.status).toBe(200);
    expect(adminVerifyRes.body.data).toBeTruthy();

    const allUsersRes = await request(app)
      .get("/api/users/admin/all-users")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(allUsersRes.status).toBe(200);
    expect(allUsersRes.body.data.length).toBeGreaterThanOrEqual(2);

    const updateRoleRes = await request(app)
      .put(`/api/users/admin/update-user-role/${user._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ role: "admin" });
    expect(updateRoleRes.status).toBe(200);
    expect(updateRoleRes.body.data.role).toBe("admin");
  });
});

