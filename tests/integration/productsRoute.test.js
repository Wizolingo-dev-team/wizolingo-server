// tests/integration/productsRoute.test.js
const request = require("supertest");
const createApp = require("../../app");
const Product = require("../../models/productModel");
const Order = require("../../models/orderModel");
const { connectTestDB, clearTestDB, closeTestDB } = require("../helpers/db");
const {
  createMockIo,
  createUserWithToken,
  createAdminWithToken,
} = require("../helpers/testFixtures");

describe("Integration: /api/products", () => {
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

  it("creates, lists (hiding raw digital URLs), updates, and deletes products", async () => {
    const { token: adminToken } = await createAdminWithToken();

    const createRes = await request(app)
      .post("/api/products/create/product")
      .set("Authorization", `Bearer ${adminToken}`)
      .field("productName", "Yolo Digital Single")
      .field("productType", "digital_music")
      .field("description", "Official digital release")
      .field("price", "3.99")
      .field("digitalReleaseType", "single")
      .field(
        "digitalFilesJson",
        JSON.stringify([
          {
            fileName: "yolo.mp3",
            fileUrl: "https://secret-cdn.example.com/yolo.mp3",
            fileFormat: "mp3",
          },
        ])
      );
    expect(createRes.status).toBe(201);
    const productId = createRes.body.data._id;

    // Public list must NOT expose digitalFiles.fileUrl
    const publicRes = await request(app).get(
      "/api/products/get-all-products?productType=digital_music"
    );
    expect(publicRes.status).toBe(200);
    expect(publicRes.body.data).toHaveLength(1);
    expect(publicRes.body.data[0].digitalFiles[0].fileUrl).toBeUndefined();

    const singleRes = await request(app).get(
      `/api/products/get-product/${productId}`
    );
    expect(singleRes.status).toBe(200);
    expect(singleRes.body.data.digitalFiles[0].fileUrl).toBeUndefined();

    // Admin list DOES include full details
    const adminRes = await request(app)
      .get("/api/products/admin/all-products")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(adminRes.status).toBe(200);
    expect(adminRes.body.data[0].digitalFiles[0].fileUrl).toBe(
      "https://secret-cdn.example.com/yolo.mp3"
    );

    const updateRes = await request(app)
      .put(`/api/products/update/product/${productId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .field("price", "4.99");
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.price).toBe(4.99);

    const delRes = await request(app)
      .delete(`/api/products/delete/product/${productId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(delRes.status).toBe(200);
  });

  it("enforces purchase verification on /download/:productId", async () => {
    const { user, token: userToken } = await createUserWithToken();
    const product = await Product.create({
      productName: "Wizolingo Album",
      productType: "digital_music",
      description: "Full album",
      price: 12,
      digitalFiles: [
        {
          fileName: "album.zip",
          fileUrl: "https://secret-cdn.example.com/album.zip",
          fileFormat: "zip",
        },
      ],
    });

    // Unpurchased user gets 403
    const deniedRes = await request(app)
      .get(`/api/products/download/${product._id}`)
      .set("Authorization", `Bearer ${userToken}`);
    expect(deniedRes.status).toBe(403);

    // Create confirmed order
    await Order.create({
      user: user._id,
      email: user.email,
      orderType: "digital",
      amount: 12,
      paymentStatus: "completed",
      downloadUnlocked: true,
      status: "Payment Confirmed",
      products: [
        {
          _id: product._id,
          productName: product.productName,
          productType: "digital_music",
          price: 12,
          quantity: 1,
        },
      ],
    });

    const allowedRes = await request(app)
      .get(`/api/products/download/${product._id}`)
      .set("Authorization", `Bearer ${userToken}`);
    expect(allowedRes.status).toBe(200);
    expect(allowedRes.body.data.digitalFiles[0].fileUrl).toBe(
      "https://secret-cdn.example.com/album.zip"
    );
  });
});

