// tests/integration/bookingsRoute.test.js
const request = require("supertest");
const createApp = require("../../app");
const Booking = require("../../models/bookingModel");
const { connectTestDB, clearTestDB, closeTestDB } = require("../helpers/db");
const {
  createMockIo,
  createAdminWithToken,
  createUserWithToken,
} = require("../helpers/testFixtures");

describe("Integration: /api/bookings", () => {
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

  it("allows public submission of booking inquiries and validates required fields", async () => {
    // Missing required fields
    const badRes = await request(app)
      .post("/api/bookings/create")
      .send({ fullName: "Organizer" });
    expect(badRes.status).toBe(400);
    expect(badRes.body.success).toBe(false);

    // Valid booking submission
    const res = await request(app)
      .post("/api/bookings/create")
      .send({
        fullName: "Jane Doe Events",
        email: "jane@festivals.com",
        phone: "+44 7123 456789",
        eventType: "festival",
        eventDate: "2026-11-15",
        country: "London, UK",
        budget: "$25,000",
        message: "We would love to invite Wiz Ofuasia to headline our annual festival.",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.fullName).toBe("Jane Doe Events");
    expect(res.body.data.status).toBe("pending");

    const saved = await Booking.findById(res.body.data._id);
    expect(saved).not.toBeNull();
    expect(saved.email).toBe("jane@festivals.com");
  });

  it("enforces admin permissions for listing, inspecting, updating, and deleting bookings", async () => {
    const { token: adminToken } = await createAdminWithToken();
    const { token: userToken } = await createUserWithToken();

    const booking = await new Booking({
      fullName: "Corporate Host",
      email: "host@corporate.org",
      eventType: "corporate",
      eventDate: "2026-12-01",
      country: "Lagos, Nigeria",
      message: "End-of-year gala performance.",
    }).save();

    // Regular user is forbidden
    const forbidden = await request(app)
      .get("/api/bookings/admin/all")
      .set("Authorization", `Bearer ${userToken}`);
    expect(forbidden.status).toBe(403);

    // Admin lists all bookings
    const listRes = await request(app)
      .get("/api/bookings/admin/all")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.total).toBe(1);

    // Admin retrieves booking by ID
    const getRes = await request(app)
      .get(`/api/bookings/admin/${booking._id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.fullName).toBe("Corporate Host");

    // Admin updates booking status and adminNotes
    const updateRes = await request(app)
      .put(`/api/bookings/admin/status/${booking._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        status: "confirmed",
        adminNotes: "Contract signed, deposit received.",
      });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.status).toBe("confirmed");
    expect(updateRes.body.data.adminNotes).toBe("Contract signed, deposit received.");

    // Admin deletes booking
    const deleteRes = await request(app)
      .delete(`/api/bookings/admin/${booking._id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(deleteRes.status).toBe(200);

    const checkRes = await Booking.findById(booking._id);
    expect(checkRes).toBeNull();
  });
});

