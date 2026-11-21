// tests/e2e/store-and-digital-downloads.e2e.test.js
const request = require("supertest");
const createApp = require("../../app");
const emailServices = require("../../utils/emailServices");
const { connectTestDB, clearTestDB, closeTestDB } = require("../helpers/db");
const {
  createMockIo,
  createUserWithToken,
  createAdminWithToken,
} = require("../helpers/testFixtures");

describe("E2E: Store, Merch, Digital Music & Downloads Journey", () => {
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

  it("completes catalog setup -> wishlist -> order -> PayPal capture -> digital download unlock", async () => {
    const { user, token: userToken } = await createUserWithToken();
    const { token: adminToken } = await createAdminWithToken();

    // 1. Admin creates category & discount
    const cat = await request(app)
      .post("/api/categories/create")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ categoryName: "Albums", categoryType: "digital_music" });

    await request(app)
      .post("/api/discounts/create")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        discountCode: "VIP20",
        discountPercentage: 20,
        expiryDate: new Date(Date.now() + 86400000),
      });

    // 2. Admin creates digital music album
    const albumRes = await request(app)
      .post("/api/products/create/product")
      .set("Authorization", `Bearer ${adminToken}`)
      .field("productName", "Wizolingo LP")
      .field("productType", "digital_music")
      .field("description", "Full studio album")
      .field("price", "15")
      .field("categories", cat.body.data._id)
      .field(
        "digitalFilesJson",
        JSON.stringify([
          {
            fileName: "wizolingo-lp.zip",
            fileUrl: "https://cdn.example.com/wizolingo-lp.zip",
            fileFormat: "zip",
          },
        ])
      );
    const albumId = albumRes.body.data._id;

    // 3. User adds album to wishlist
    await request(app)
      .post("/api/wishlists/toggle")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ productId: albumId });

    // 4. User creates order with discount code
    const orderRes = await request(app)
      .post("/api/order/create-order")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        email: user.email,
        discountCode: "VIP20",
        products: [{ _id: albumId, quantity: 1 }],
      });
    expect(orderRes.status).toBe(201);
    const orderId = orderRes.body.data.order._id;
    expect(orderRes.body.data.order.amount).toBe(12);

    // 5. User cannot download before payment capture
    const lockedRes = await request(app)
      .get(`/api/products/download/${albumId}`)
      .set("Authorization", `Bearer ${userToken}`);
    expect(lockedRes.status).toBe(403);

    // 6. PayPal capture unlocks download
    const captureRes = await request(app)
      .post("/api/payment/paypal/capture-order")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ orderId, transactionId: "PP-E2E-001" });
    expect(captureRes.status).toBe(200);
    expect(captureRes.body.data.downloadUnlocked).toBe(true);

    // 7. User downloads unlocked digital files
    const downloadRes = await request(app)
      .get(`/api/products/download/${albumId}`)
      .set("Authorization", `Bearer ${userToken}`);
    expect(downloadRes.status).toBe(200);
    expect(downloadRes.body.data.digitalFiles[0].fileUrl).toBe(
      "https://cdn.example.com/wizolingo-lp.zip"
    );
  });
});

