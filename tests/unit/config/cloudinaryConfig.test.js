// tests/unit/config/cloudinaryConfig.test.js
describe("config/cloudinaryConfig", () => {
  it("exports configured cloudinary v2 instance", () => {
    process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
    process.env.CLOUDINARY_API_KEY = "test-key";
    process.env.CLOUDINARY_API_SECRET = "test-secret";

    const cloudinary = require("../../../config/cloudinaryConfig");
    expect(cloudinary).toBeDefined();
    expect(typeof cloudinary.uploader.upload_stream).toBe("function");
    expect(cloudinary.config().cloud_name).toBeDefined();
  });
});

