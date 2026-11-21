// tests/integration/categoryRoute.test.js
const request = require("supertest");
const createApp = require("../../app");
const { connectTestDB, clearTestDB, closeTestDB } = require("../helpers/db");
const {
  createMockIo,
  createAdminWithToken,
  createUserWithToken,
} = require("../helpers/testFixtures");

describe("Integration: /api/categories", () => {
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

  it("performs admin CRUD and public listing", async () => {
    const { token: adminToken } = await createAdminWithToken();
    const { token: userToken } = await createUserWithToken();

    // Non-admin blocked
    const forbidden = await request(app)
      .post("/api/categories/create")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ categoryName: "Vinyl" });
    expect(forbidden.status).toBe(403);

    const createRes = await request(app)
      .post("/api/categories/create")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        categoryName: "Digital Singles",
        categoryType: "digital_music",
        subcategories: [{ subcategoryName: "Afrobeats" }],
      });
    expect(createRes.status).toBe(201);
    const catId = createRes.body.data._id;

    const listRes = await request(app).get(
      "/api/categories/get-all-categories?categoryType=digital_music"
    );
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);

    const updateRes = await request(app)
      .put(`/api/categories/update/${catId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ categoryName: "Digital Releases" });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.categoryName).toBe("Digital Releases");

    const delRes = await request(app)
      .delete(`/api/categories/delete/${catId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(delRes.status).toBe(200);
  });
});

