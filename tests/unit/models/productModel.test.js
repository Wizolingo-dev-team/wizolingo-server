// tests/unit/models/productModel.test.js
const Product = require("../../../models/productModel");

describe("models/productModel", () => {
  it("validates digital_music product with digitalFiles and tracklist", () => {
    const product = new Product({
      productName: "Yolo (Deluxe Single)",
      productType: "digital_music",
      description: "High-res lossless download",
      price: 4.99,
      digitalReleaseType: "single",
      digitalFiles: [
        {
          fileName: "yolo.wav",
          fileUrl: "https://cdn.example.com/yolo.wav",
          fileFormat: "wav",
          fileSize: 45000000,
        },
      ],
      tracklist: [{ trackNumber: 1, title: "Yolo", duration: "3:42" }],
    });

    expect(product.validateSync()).toBeUndefined();
    expect(product.artist).toBe("Wiz Ofuasia (Wizboyy)");
    expect(product.sold).toBe(0);
    expect(product.downloadCount).toBe(0);
  });

  it("rejects invalid productType and negative price", () => {
    const product = new Product({
      productName: "Bad Item",
      productType: "streaming",
      description: "Invalid",
      price: -5,
    });
    const err = product.validateSync();
    expect(err.errors.productType).toBeDefined();
    expect(err.errors.price).toBeDefined();
  });
});

