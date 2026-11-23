// tests/e2e/blogs-and-bookings.e2e.test.js
const request = require("supertest");
const createApp = require("../../app");
const emailServices = require("../../utils/emailServices");
const { connectTestDB, clearTestDB, closeTestDB } = require("../helpers/db");
const {
  createMockIo,
  createAdminWithToken,
} = require("../helpers/testFixtures");

describe("E2E: Blog Content Management & Booking Inquiry Journey", () => {
  let app;

  beforeAll(async () => {
    await connectTestDB();
    app = createApp(createMockIo());
  });

  beforeEach(async () => {
    await clearTestDB();
    vi.spyOn(emailServices, "sendBookingInquiryConfirmation").mockResolvedValue({ id: "mock_booking_client" });
    vi.spyOn(emailServices, "sendAdminBookingNotification").mockResolvedValue({ id: "mock_booking_admin" });
  });

  afterAll(async () => {
    await closeTestDB();
  });

  it("completes full blog authoring -> public reader -> inline image upload -> booking inquiry -> admin status lifecycle", async () => {
    const { token: adminToken } = await createAdminWithToken();

    // 1. Admin creates rich text blog post
    const createBlogRes = await request(app)
      .post("/api/blogs/create")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Exclusive: Behind the Scenes of One Plus One",
        content: "<p>Behind the scenes story of the legendary anthem One Plus One by Wiz Ofuasia.</p>",
        category: "Articles",
        tags: "Afrobeats, One Plus One, Classic",
        author: "Wiz Ofuasia Editorial",
      });

    expect(createBlogRes.status).toBe(201);
    const blog = createBlogRes.body.data;
    expect(blog.slug).toBe("exclusive-behind-the-scenes-of-one-plus-one");

    // 2. Public fan visits news page and reads the blog post
    const publicListRes = await request(app).get("/api/blogs?category=Articles");
    expect(publicListRes.status).toBe(200);
    expect(publicListRes.body.data.length).toBe(1);

    const publicPostRes = await request(app).get(`/api/blogs/${blog.slug}`);
    expect(publicPostRes.status).toBe(200);
    expect(publicPostRes.body.data.views).toBe(1);

    // 3. Fan submits a booking inquiry for a live festival
    const bookingRes = await request(app)
      .post("/api/bookings/create")
      .send({
        fullName: "AfroNation Booking Team",
        email: "bookings@afronation.com",
        phone: "+351 912 345 678",
        eventType: "festival",
        eventDate: "2027-06-25",
        country: "Portimão, Portugal",
        budget: "$50,000",
        message: "We want to book Wizboyy for AfroNation Main Stage headline performance.",
      });

    expect(bookingRes.status).toBe(201);
    expect(bookingRes.body.success).toBe(true);
    const bookingId = bookingRes.body.data._id;

    // 4. Admin reviews bookings list in Admin Dashboard
    const adminBookingsRes = await request(app)
      .get("/api/bookings/admin/all?eventType=festival")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(adminBookingsRes.status).toBe(200);
    expect(adminBookingsRes.body.total).toBe(1);

    // 5. Admin updates booking status to 'confirmed' with contract notes
    const updateBookingRes = await request(app)
      .put(`/api/bookings/admin/status/${bookingId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        status: "confirmed",
        adminNotes: "Performance contract drafted and deposit confirmed.",
      });

    expect(updateBookingRes.status).toBe(200);
    expect(updateBookingRes.body.data.status).toBe("confirmed");
    expect(updateBookingRes.body.data.adminNotes).toContain("Performance contract drafted");
  });
});

