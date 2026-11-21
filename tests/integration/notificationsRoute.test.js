// tests/integration/notificationsRoute.test.js
const request = require("supertest");
const createApp = require("../../app");
const { connectTestDB, clearTestDB, closeTestDB } = require("../helpers/db");
const {
  createMockIo,
  createUserWithToken,
  createAdminWithToken,
} = require("../helpers/testFixtures");

describe("Integration: /api/notifications", () => {
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

  it("performs user and admin notifications CRUD + broadcast", async () => {
    const { user, token: userToken } = await createUserWithToken();
    const { token: adminToken } = await createAdminWithToken();

    const broadcastRes = await request(app)
      .post("/api/notifications/admin/broadcast")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        userId: user._id,
        title: "New Drop",
        description: "Listen to Yolo now",
        type: "system",
        onClick: "/songs",
      });
    expect(broadcastRes.status).toBe(201);
    const notifId = broadcastRes.body.data[0]._id;

    const getRes = await request(app)
      .get("/api/notifications/get-all-notifications")
      .set("Authorization", `Bearer ${userToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data).toHaveLength(1);

    const readOneRes = await request(app)
      .post(`/api/notifications/mark-as-read/${notifId}`)
      .set("Authorization", `Bearer ${userToken}`);
    expect(readOneRes.status).toBe(200);
    expect(readOneRes.body.data.read).toBe(true);

    const delRes = await request(app)
      .delete(`/api/notifications/delete-notification/${notifId}`)
      .set("Authorization", `Bearer ${userToken}`);
    expect(delRes.status).toBe(200);
  });
});

