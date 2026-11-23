// tests/integration/blogsRoute.test.js
const request = require("supertest");
const createApp = require("../../app");
const Blog = require("../../models/blogModel");
const { connectTestDB, clearTestDB, closeTestDB } = require("../helpers/db");
const {
  createMockIo,
  createAdminWithToken,
  createUserWithToken,
} = require("../helpers/testFixtures");

describe("Integration: /api/blogs", () => {
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

  it("handles public listing, categories, tags, and retrieval by slug with view increment", async () => {
    const post = await new Blog({
      title: "5 Amazing Facts About Wiz Ofuasia",
      slug: "5-amazing-facts-about-wiz-ofuasia",
      excerpt: "Facts about Wiz Ofuasia",
      content: "<p>Paragraph 1</p><p>Paragraph 2</p>",
      category: "Articles",
      tags: ["Biography", "Music"],
      status: "Published",
      isPublished: true,
    }).save();

    // Public list
    const listRes = await request(app).get("/api/blogs");
    expect(listRes.status).toBe(200);
    expect(listRes.body.success).toBe(true);
    expect(listRes.body.data.length).toBe(1);
    expect(listRes.body.data[0].slug).toBe("5-amazing-facts-about-wiz-ofuasia");

    // Public categories
    const catRes = await request(app).get("/api/blogs/categories");
    expect(catRes.status).toBe(200);
    expect(catRes.body.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "Articles", count: 1 })])
    );

    // Public tags
    const tagsRes = await request(app).get("/api/blogs/tags");
    expect(tagsRes.status).toBe(200);
    expect(tagsRes.body.data).toContain("Biography");

    // Retrieve by slug
    const getRes = await request(app).get(`/api/blogs/${post.slug}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.views).toBe(1);

    // Retrieve by ID
    const getByIdRes = await request(app).get(`/api/blogs/${post._id}`);
    expect(getByIdRes.status).toBe(200);
    expect(getByIdRes.body.data.views).toBe(2);
  });

  it("handles admin blog creation, updating, and deletion with permission protection", async () => {
    const { token: adminToken } = await createAdminWithToken();
    const { token: userToken } = await createUserWithToken();

    // Non-admin blocked from creating
    const forbiddenRes = await request(app)
      .post("/api/blogs/create")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        title: "Unauthorized Post",
        content: "<p>Should be rejected</p>",
      });
    expect(forbiddenRes.status).toBe(403);

    // Admin creates post
    const createRes = await request(app)
      .post("/api/blogs/create")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Live Tour in Dallas Announced",
        content: "<p>Wiz Ofuasia live show details.</p>",
        category: "Events & Live",
        tags: ["Live", "Tour", "Dallas"],
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.data.slug).toBe("live-tour-in-dallas-announced");

    const blogId = createRes.body.data._id;

    // Admin updates post
    const updateRes = await request(app)
      .put(`/api/blogs/update/${blogId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Live Tour in Dallas & Houston Announced",
        tags: ["Live", "Tour", "Dallas", "Houston"],
      });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.title).toBe("Live Tour in Dallas & Houston Announced");
    expect(updateRes.body.data.tags).toContain("Houston");

    // Admin gets all blogs (including drafts)
    const adminListRes = await request(app)
      .get("/api/blogs/admin/all")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(adminListRes.status).toBe(200);
    expect(adminListRes.body.total).toBe(1);

    // Admin deletes post
    const deleteRes = await request(app)
      .delete(`/api/blogs/delete/${blogId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(deleteRes.status).toBe(200);

    const checkRes = await request(app).get(`/api/blogs/${blogId}`);
    expect(checkRes.status).toBe(404);
  });
});

