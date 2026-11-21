// tests/integration/discountRoute.test.js
const request = require("supertest");
const createApp = require("../../app");
const { connectTestDB, clearTestDB, closeTestDB } = require("../helpers/db");
const {
  createMockIo,
  createAdminWithToken,
  createUserWithToken,
} = require("../helpers/testFixtures");

describe("Integration: /api/discounts", () => {
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

  it("creates, lists, validates, updates, and deletes discounts", async () => {
    const { token: adminToken } = await createAdminWithToken();
    const { token: userToken } = await createUserWithToken();

    const createRes = await request(app)
      .post("/api/discounts/create")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        discountCode: "WIZ25",
        discountPercentage: 25,
        expiryDate: new Date(Date.now() + 86400000),
      });
    expect(createRes.status).toBe(201);
    const id = createRes.body.data._id;

    const allRes = await request(app)
      .get("/api/discounts/admin/all")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(allRes.status).toBe(200);
    expect(allRes.body.data).toHaveLength(1);

    const validateRes = await request(app)
      .post("/api/discounts/validate")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ code: "wiz25" });
    expect(validateRes.status).toBe(200);
    expect(validateRes.body.data.discountPercentage).toBe(25);

    const updateRes = await request(app)
      .put(`/api/discounts/update/${id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ discountPercentage: 30 });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.discountPercentage).toBe(30);

    const delRes = await request(app)
      .delete(`/api/discounts/delete/${id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(delRes.status).toBe(200);
  });
});

