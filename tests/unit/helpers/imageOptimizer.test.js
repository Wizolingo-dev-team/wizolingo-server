// tests/unit/helpers/imageOptimizer.test.js
const sharp = require("sharp");
const { optimizeImageBuffer } = require("../../../helpers/imageOptimizer");

describe("helpers/imageOptimizer", () => {
  it("returns non-buffer inputs untouched", async () => {
    expect(await optimizeImageBuffer(null)).toBeNull();
    expect(await optimizeImageBuffer("not-a-buffer")).toBe("not-a-buffer");
  });

  it("compresses and resizes an oversized image buffer", async () => {
    // Generate a 3000x3000 raw image
    const largeBuffer = await sharp({
      create: {
        width: 3000,
        height: 3000,
        channels: 3,
        background: { r: 215, g: 14, b: 29 },
      },
    })
      .jpeg({ quality: 100 })
      .toBuffer();

    const optimized = await optimizeImageBuffer(largeBuffer, 1200, 80);
    const meta = await sharp(optimized).metadata();

    expect(meta.width).toBeLessThanOrEqual(1200);
    expect(meta.height).toBeLessThanOrEqual(1200);
    expect(optimized.length).toBeLessThan(largeBuffer.length);
  });
});

