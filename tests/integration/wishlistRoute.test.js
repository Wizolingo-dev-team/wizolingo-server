// tests/integration/wishlistRoute.test.js
const request = require("supertest");
const createApp = require("../../app");
const Product = require("../../models/productModel");
const { connectTestDB, clearTestDB, closeTestDB } = require("../helpers/db");
const { createMockIo, createUserWithToken } = require("../helpers/testFixtures");

describe("Integration: /api/wishlists", () => {
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

  it("toggles products in user wishlist and retrieves wishlist", async () => {
    const { token } = await createUserWithToken();
    const product = await Product.create({
      productName: "Wizolingo Cap",
      productType: "merch",
      description: "Black snapback",
      price: 25,
      quantity: 15,
    });

    const addRes = await request(app)
      .post("/api/wishlists/toggle")
      .set("Authorization", `Bearer ${token}`)
      .send({ productId: product._id });
    expect(addRes.status).toBe(200);
    expect(addRes.body.data.products).toHaveLength(1);

    const getRes = await request(app)
      .get("/api/wishlists")
      .set("Authorization", `Bearer ${token}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.products).toHaveLength(1);

    const removeRes = await request(app)
      .post("/api/wishlists/toggle")
      .set("Authorization", `Bearer ${token}`)
      .send({ productId: product._id });
    expect(removeRes.status).toBe(200);
    expect(removeRes.body.data.products).toHaveLength(0);
  });
});

