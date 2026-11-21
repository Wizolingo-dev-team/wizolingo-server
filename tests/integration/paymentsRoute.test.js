// tests/integration/paymentsRoute.test.js
const request = require("supertest");
const createApp = require("../../app");
const Order = require("../../models/orderModel");
const emailServices = require("../../utils/emailServices");
const { connectTestDB, clearTestDB, closeTestDB } = require("../helpers/db");
const { createMockIo, createUserWithToken } = require("../helpers/testFixtures");

describe("Integration: /api/payment", () => {
  let app;

  beforeAll(async () => {
    await connectTestDB();
    app = createApp(createMockIo());
  });

  beforeEach(async () => {
    await clearTestDB();
    vi.spyOn(emailServices, "sendOrderStatusUpdate").mockResolvedValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  it("creates PayPal placeholder session, captures order, and responds on webhook", async () => {
    const { user, token } = await createUserWithToken();
    const order = await Order.create({
      user: user._id,
      email: user.email,
      orderType: "digital",
      amount: 10,
      products: [],
    });

    const createRes = await request(app)
      .post("/api/payment/paypal/create-order")
      .set("Authorization", `Bearer ${token}`)
      .send({ orderId: order._id });
    expect(createRes.status).toBe(200);
    expect(createRes.body.data.provider).toBe("paypal");

    const captureRes = await request(app)
      .post("/api/payment/paypal/capture-order")
      .set("Authorization", `Bearer ${token}`)
      .send({ orderId: order._id, transactionId: "PP-TXN-1" });
    expect(captureRes.status).toBe(200);
    expect(captureRes.body.data.paymentStatus).toBe("completed");
    expect(captureRes.body.data.downloadUnlocked).toBe(true);

    const webhookRes = await request(app)
      .post("/api/payment/webhook")
      .send({ event_type: "PAYMENT.CAPTURE.COMPLETED" });
    expect(webhookRes.status).toBe(200);
  });
});

