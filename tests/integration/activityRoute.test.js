// tests/integration/activityRoute.test.js
const request = require("supertest");
const createApp = require("../../app");
const Activity = require("../../models/activityModel");
const { connectTestDB, clearTestDB, closeTestDB } = require("../helpers/db");
const {
  createMockIo,
  createUserWithToken,
  createAdminWithToken,
} = require("../helpers/testFixtures");

describe("Integration: /api/activity", () => {
  let app;

  beforeAll(async () => {
    await connectTestDB();
    app = createApp(createMockIo());
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  it("returns user own activities and admin all activities", async () => {
    const { user, token: userToken } = await createUserWithToken();
    const { token: adminToken } = await createAdminWithToken();

    await Activity.create({
      user: user._id,
      action: "LOGIN",
      details: "Logged in",
    });

    const myRes = await request(app)
      .get("/api/activity/my-activities")
      .set("Authorization", `Bearer ${userToken}`);
    expect(myRes.status).toBe(200);
    expect(myRes.body.data).toHaveLength(1);

    const adminRes = await request(app)
      .get("/api/activity/admin/all")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(adminRes.status).toBe(200);
    expect(adminRes.body.data).toHaveLength(1);
  });
});

