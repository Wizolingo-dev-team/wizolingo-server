// tests/integration/eventsRoute.test.js
const request = require("supertest");
const createApp = require("../../app");
const emailServices = require("../../utils/emailServices");
const { connectTestDB, clearTestDB, closeTestDB } = require("../helpers/db");
const {
  createMockIo,
  createUserWithToken,
  createAdminWithToken,
} = require("../helpers/testFixtures");

describe("Integration: /api/events", () => {
  let app;

  beforeAll(async () => {
    await connectTestDB();
    app = createApp(createMockIo());
  });

  beforeEach(async () => {
    await clearTestDB();
    vi.spyOn(emailServices, "sendTicketConfirmation").mockResolvedValue();
    vi.spyOn(emailServices, "sendAdminTicketNotification").mockResolvedValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  it("manages admin event CRUD, user event lookup with shareUrl, and ticket purchase/cancellation", async () => {
    const { user, token: userToken } = await createUserWithToken();
    const { token: adminToken } = await createAdminWithToken();

    const createRes = await request(app)
      .post("/api/events/admin/create")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Wizolingo London Tour",
        description: "Live performance",
        startDate: "2026-12-20T20:00:00Z",
        venue: "Indigo at The O2",
        location: "LONDON, ENGLAND",
        mapEmbedUrl: "https://maps.google.com/?q=London",
        status: "ON SALE",
        ticketTiers: JSON.stringify([
          { name: "VIP", price: 100, totalQuantity: 10 },
        ]),
      });

    expect(createRes.status).toBe(201);
    const event = createRes.body.data;
    const tierId = event.ticketTiers[0]._id;

    const listRes = await request(app).get("/api/events/get-all-events");
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);

    const detailRes = await request(app).get(
      `/api/events/get-event/${event.slug}`
    );
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.data.shareUrl).toContain(`/events/${event.slug}`);

    const buyRes = await request(app)
      .post("/api/events/purchase-ticket")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        eventId: event._id,
        attendeeName: "Wiz Fan",
        email: user.email,
        tickets: [{ tierId, quantity: 2 }],
      });
    expect(buyRes.status).toBe(201);
    const ticketOrderId = buyRes.body.data.ticketOrder._id;

    const myTicketsRes = await request(app)
      .get("/api/events/my-tickets")
      .set("Authorization", `Bearer ${userToken}`);
    expect(myTicketsRes.status).toBe(200);
    expect(myTicketsRes.body.data).toHaveLength(1);

    const salesRes = await request(app)
      .get(`/api/events/admin/ticket-orders?eventId=${event._id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(salesRes.status).toBe(200);
    expect(salesRes.body.summary.totalTicketsSold).toBe(2);
    expect(salesRes.body.summary.totalRevenue).toBe(200);

    // Cancel ticket order -> restores soldQuantity
    const cancelRes = await request(app)
      .put(`/api/events/admin/update-ticket-status/${ticketOrderId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "Cancelled" });
    expect(cancelRes.status).toBe(200);

    const afterCancel = await request(app).get(
      `/api/events/get-event/${event._id}`
    );
    expect(afterCancel.body.data.ticketTiers[0].soldQuantity).toBe(0);
  });
});

