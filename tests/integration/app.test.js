// tests/integration/app.test.js
const request = require("supertest");
const createApp = require("../../app");
const { createMockIo } = require("../helpers/testFixtures");

describe("Integration: app.js", () => {
  it("responds 200 on root health check", async () => {
    const app = createApp(createMockIo());
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: "Wizolingo Server API is running",
    });
  });
});

