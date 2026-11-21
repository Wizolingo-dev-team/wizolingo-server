// tests/integration/newsletterRoute.test.js
const request = require("supertest");
const createApp = require("../../app");
const emailServices = require("../../utils/emailServices");
const { connectTestDB, clearTestDB, closeTestDB } = require("../helpers/db");
const { createMockIo, createAdminWithToken } = require("../helpers/testFixtures");

describe("Integration: /api/newsletter", () => {
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

  it("handles public subscribe/unsubscribe and admin subscribers/templates CRUD + campaign send", async () => {
    const { token: adminToken } = await createAdminWithToken();

    const subRes = await request(app)
      .post("/api/newsletter/subscribe")
      .send({ email: "fan@example.com", name: "Wiz Fan", source: "popup" });
    expect(subRes.status).toBe(201);
    const unsubToken = subRes.body.data.unsubscribeToken;

    const subsList = await request(app)
      .get("/api/newsletter/admin/subscribers")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(subsList.status).toBe(200);
    expect(subsList.body.count).toBe(1);

    const tplRes = await request(app)
      .post("/api/newsletter/admin/templates")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Tour Announcement",
        subject: "Wiz Ofuasia Tour Dates!",
        htmlContent: "<p>Tickets are live!</p>",
        category: "tour",
      });
    expect(tplRes.status).toBe(201);
    const tplId = tplRes.body.data._id;

    const sendRes = await request(app)
      .post(`/api/newsletter/admin/templates/${tplId}/send`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({});
    expect(sendRes.status).toBe(200);
    expect(sendRes.body.data.status).toBe("sent");
    expect(sendRes.body.data.sentCount).toBe(1);

    const unsubRes = await request(app)
      .post("/api/newsletter/unsubscribe")
      .send({ token: unsubToken });
    expect(unsubRes.status).toBe(200);
  });
});

