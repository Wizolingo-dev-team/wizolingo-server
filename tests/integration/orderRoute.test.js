// tests/integration/orderRoute.test.js
const request = require("supertest");
const createApp = require("../../app");
const Product = require("../../models/productModel");
const Discount = require("../../models/discountModel");
const DeliveryFee = require("../../models/deliveryFeeModel");
const emailServices = require("../../utils/emailServices");
const { connectTestDB, clearTestDB, closeTestDB } = require("../helpers/db");
const {
  createMockIo,
  createUserWithToken,
  createAdminWithToken,
} = require("../helpers/testFixtures");

describe("Integration: /api/order", () => {
  let app;

  beforeAll(async () => {
    await connectTestDB();
    app = createApp(createMockIo());
  });

  beforeEach(async () => {
    await clearTestDB();
    vi.spyOn(emailServices, "sendOrderConfirmation").mockResolvedValue();
    vi.spyOn(emailServices, "sendAdminOrderNotification").mockResolvedValue();
    vi.spyOn(emailServices, "sendOrderStatusUpdate").mockResolvedValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  it("creates mixed order with discount + delivery fee, updates status, and unlocks digital downloads", async () => {
    const { user, token: userToken } = await createUserWithToken();
    const { token: adminToken } = await createAdminWithToken();

    const merch = await Product.create({
      productName: "Wizolingo Tee",
      productType: "merch",
      description: "Cotton tee",
      price: 30,
      quantity: 5,
    });
    const digital = await Product.create({
      productName: "More Billionaires MP3",
      productType: "digital_music",
      description: "Single",
      price: 5,
      digitalFiles: [
        {
          fileName: "mb.mp3",
          fileUrl: "https://cdn.example.com/mb.mp3",
          fileFormat: "mp3",
        },
      ],
    });

    await Discount.create({
      discountCode: "WIZ10",
      discountPercentage: 10,
      expiryDate: new Date(Date.now() + 86400000),
    });

    await DeliveryFee.create({
      country: "nigeria",
      states: [{ state: "lagos", fee: 5 }],
    });

    const createRes = await request(app)
      .post("/api/order/create-order")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        email: user.email,
        country: "Nigeria",
        state: "Lagos",
        address: "10 Victoria Island",
        discountCode: "WIZ10",
        products: [
          { _id: merch._id, quantity: 1, size: "L" },
          { _id: digital._id, quantity: 1 },
        ],
      });

    expect(createRes.status).toBe(201);
    const order = createRes.body.data.order;
    expect(order.orderType).toBe("mixed");
    expect(order.subtotal).toBe(35);
    expect(order.discountAmount).toBe(3.5);
    expect(order.deliveryFee).toBe(5);
    expect(order.amount).toBe(36.5);

    const userOrdersRes = await request(app)
      .get("/api/order/get-user-orders")
      .set("Authorization", `Bearer ${userToken}`);
    expect(userOrdersRes.status).toBe(200);
    expect(userOrdersRes.body.data).toHaveLength(1);

    // Admin confirms order -> unlocks digital downloads
    const updateRes = await request(app)
      .put(`/api/order/admin/update-order-status/${order._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "Payment Confirmed" });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.downloadUnlocked).toBe(true);

    const downloadsRes = await request(app)
      .get("/api/order/get-my-downloads")
      .set("Authorization", `Bearer ${userToken}`);
    expect(downloadsRes.status).toBe(200);
    expect(downloadsRes.body.data).toHaveLength(1);
    expect(downloadsRes.body.data[0].productName).toBe("More Billionaires MP3");
  });
});

