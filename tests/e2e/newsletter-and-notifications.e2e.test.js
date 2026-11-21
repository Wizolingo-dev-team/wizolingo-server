// tests/e2e/newsletter-and-notifications.e2e.test.js
const request = require("supertest");
const createApp = require("../../app");
const emailServices = require("../../utils/emailServices");
const { connectTestDB, clearTestDB, closeTestDB } = require("../helpers/db");
const {
  createMockIo,
  createUserWithToken,
  createAdminWithToken,
} = require("../helpers/testFixtures");

describe("E2E: Newsletter Campaign & In-App Notifications Journey", () => {
  let app;

  beforeAll(async () => {
    await connectTestDB();
    app = createApp(createMockIo());
  });

  beforeEach(async () => {
    await clearTestDB();
    vi.spyOn(emailServices, "sendNewsletterWelcome").mockResolvedValue();
    vi.spyOn(emailServices, "sendNewsletterCampaign").mockResolvedValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  it("completes newsletter subscribe -> template broadcast -> admin notification -> user read & clear", async () => {
    const { token: userToken } = await createUserWithToken();
    const { token: adminToken } = await createAdminWithToken();

    // 1. Visitor subscribes
    const sub = await request(app)
      .post("/api/newsletter/subscribe")
      .send({ email: "innercircle@example.com", source: "footer" });
    expect(sub.status).toBe(201);

    // 2. Admin creates & sends campaign
    const tpl = await request(app)
      .post("/api/newsletter/admin/templates")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Merch Restock",
        subject: "Hoodies are back!",
        htmlContent: "<p>Shop now</p>",
        category: "merch",
      });
    const send = await request(app)
      .post(`/api/newsletter/admin/templates/${tpl.body.data._id}/send`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({});
    expect(send.status).toBe(200);
    expect(emailServices.sendNewsletterCampaign).toHaveBeenCalledTimes(1);

    // 3. Admin broadcasts in-app notification to all users
    const broadcast = await request(app)
      .post("/api/notifications/admin/broadcast")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Merch Restock",
        description: "Check out the new Wizolingo hoodies",
        type: "system",
      });
    expect(broadcast.status).toBe(201);

    // 4. User marks all read & deletes all
    const markAll = await request(app)
      .post("/api/notifications/mark-as-read")
      .set("Authorization", `Bearer ${userToken}`);
    expect(markAll.status).toBe(200);
    expect(markAll.body.data[0].read).toBe(true);

    const clearAll = await request(app)
      .delete("/api/notifications/delete-all-notifications")
      .set("Authorization", `Bearer ${userToken}`);
    expect(clearAll.status).toBe(200);
  });
});

