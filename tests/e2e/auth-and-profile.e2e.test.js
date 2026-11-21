// tests/e2e/auth-and-profile.e2e.test.js
const request = require("supertest");
const createApp = require("../../app");
const User = require("../../models/userModel");
const emailServices = require("../../utils/emailServices");
const { connectTestDB, clearTestDB, closeTestDB } = require("../helpers/db");
const { createMockIo, createAdminWithToken } = require("../helpers/testFixtures");

describe("E2E: User & Admin Auth + Profile Journey", () => {
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

  it("completes full user registration -> OTP -> login -> profile update -> password reset -> admin OTP login", async () => {
    // 1. Register user
    const reg = await request(app).post("/api/users/register").send({
      firstName: "Chidi",
      lastName: "Nwosu",
      email: "chidi@example.com",
      password: "Password123",
    });
    expect(reg.status).toBe(201);

    // 2. Verify email with OTP
    const userDoc = await User.findOne({ email: "chidi@example.com" });
    const verify = await request(app).post("/api/users/verify-email").send({
      email: "chidi@example.com",
      otp: userDoc.otp,
    });
    expect(verify.status).toBe(200);

    // 3. Login
    const login = await request(app).post("/api/users/login").send({
      email: "chidi@example.com",
      password: "Password123",
    });
    expect(login.status).toBe(200);
    const token = login.body.data;

    // 4. Update profile
    const update = await request(app)
      .put("/api/profile/update")
      .set("Authorization", `Bearer ${token}`)
      .send({ address: "45 Abuja Street" });
    expect(update.status).toBe(200);
    expect(update.body.data.address).toBe("45 Abuja Street");

    // 5. Forgot & Reset Password
    await request(app)
      .post("/api/users/forgot-password")
      .send({ email: "chidi@example.com" });
    const refreshed = await User.findOne({ email: "chidi@example.com" });
    const reset = await request(app)
      .post(`/api/users/reset-password/${refreshed.resetPasswordToken}`)
      .send({ password: "NewSecurePassword123" });
    expect(reset.status).toBe(200);

    // 6. Login with new password
    const reLogin = await request(app).post("/api/users/login").send({
      email: "chidi@example.com",
      password: "NewSecurePassword123",
    });
    expect(reLogin.status).toBe(200);

    // 7. Admin 2-step OTP login
    await createAdminWithToken({
      email: "boss@wizofuasia.com",
      password: "AdminPassword123",
    });
    const adminStep1 = await request(app).post("/api/users/admin/login").send({
      email: "boss@wizofuasia.com",
      password: "AdminPassword123",
    });
    expect(adminStep1.status).toBe(200);

    const adminDoc = await User.findOne({ email: "boss@wizofuasia.com" });
    const adminStep2 = await request(app)
      .post("/api/users/admin/verify-login")
      .send({ email: "boss@wizofuasia.com", otp: adminDoc.otp });
    expect(adminStep2.status).toBe(200);
    expect(adminStep2.body.data).toBeTruthy();
  });
});

