// tests/unit/models/blogModel.test.js
const Blog = require("../../../models/blogModel");

describe("models/blogModel", () => {
  it("validates valid blog model with default values", () => {
    const blog = new Blog({
      title: "New Wizolingo Album Released",
      slug: "new-wizolingo-album-released",
      content: "<p>Full article rich text content goes here.</p>",
      category: "Releases",
      tags: ["Album", "Music"],
    });

    expect(blog.validateSync()).toBeUndefined();
    expect(blog.status).toBe("Published");
    expect(blog.isPublished).toBe(true);
    expect(blog.author).toBe("Wiz Ofuasia Editorial");
    expect(blog.views).toBe(0);
  });

  it("fails validation when required fields are missing", () => {
    const blog = new Blog({});
    const err = blog.validateSync();
    expect(err.errors.title).toBeDefined();
    expect(err.errors.slug).toBeDefined();
    expect(err.errors.content).toBeDefined();
  });
});

