// tests/integration/profileRoute.test.js
const request = require("supertest");
const createApp = require("../../app");
const { connectTestDB, clearTestDB, closeTestDB } = require("../helpers/db");
const { createMockIo, createUserWithToken } = require("../helpers/testFixtures");

describe("Integration: /api/profile", () => {
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

  it("retrieves, updates profile, and changes password", async () => {
    const { token } = await createUserWithToken({ password: "OldPassword123" });

    const getRes = await request(app)
      .get("/api/profile")
      .set("Authorization", `Bearer ${token}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.firstName).toBe("Wiz");

    const updateRes = await request(app)
      .put("/api/profile/update")
      .set("Authorization", `Bearer ${token}`)
      .send({ firstName: "Wizzy", phoneNumber: "08099999999" });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.firstName).toBe("Wizzy");

    const passRes = await request(app)
      .put("/api/profile/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: "OldPassword123", newPassword: "NewPassword123" });
    expect(passRes.status).toBe(200);
    expect(passRes.body.success).toBe(true);
  });
});

