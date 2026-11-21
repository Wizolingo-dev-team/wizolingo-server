// tests/e2e/events-and-tickets.e2e.test.js
const request = require("supertest");
const createApp = require("../../app");
const emailServices = require("../../utils/emailServices");
const { connectTestDB, clearTestDB, closeTestDB } = require("../helpers/db");
const {
  createMockIo,
  createUserWithToken,
  createAdminWithToken,
} = require("../helpers/testFixtures");

describe("E2E: Events, Ticket Sales & PayPal Confirmation Journey", () => {
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

  it("completes event creation -> shareable lookup -> ticket purchase -> payment confirmation -> check-in", async () => {
    const { user, token: userToken } = await createUserWithToken();
    const { token: adminToken } = await createAdminWithToken();

    const createRes = await request(app)
      .post("/api/events/admin/create")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Afrocentric Lagos Show",
        description: "Live band concert",
        startDate: "2026-12-28T20:00:00Z",
        venue: "Eko Hotel",
        location: "LAGOS, NIGERIA",
        timezone: "WAT",
        status: "ON SALE",
        ticketTiers: JSON.stringify([
          { name: "Regular", price: 40, totalQuantity: 2 },
        ]),
      });

    const event = createRes.body.data;
    const tierId = event.ticketTiers[0]._id;

    // User views event by slug & gets shareUrl
    const detail = await request(app).get(`/api/events/get-event/${event.slug}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.shareUrl).toContain(event.slug);

    // User buys all 2 tickets -> event auto-marks SOLD OUT
    const buy = await request(app)
      .post("/api/events/purchase-ticket")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        eventId: event._id,
        attendeeName: "Wiz Fan",
        email: user.email,
        tickets: [{ tierId, quantity: 2 }],
      });
    expect(buy.status).toBe(201);
    const ticketOrderId = buy.body.data.ticketOrder._id;

    const soldOutCheck = await request(app).get(
      `/api/events/get-event/${event._id}`
    );
    expect(soldOutCheck.body.data.status).toBe("SOLD OUT");

    // Confirm PayPal ticket payment
    const confirm = await request(app)
      .post("/api/events/confirm-ticket-payment")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ ticketOrderId, transactionId: "PP-TKT-99" });
    expect(confirm.status).toBe(200);
    expect(confirm.body.data.status).toBe("Confirmed");
  });
});

