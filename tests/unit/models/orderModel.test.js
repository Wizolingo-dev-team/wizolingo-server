// tests/unit/models/orderModel.test.js
const mongoose = require("mongoose");
const Order = require("../../../models/orderModel");

describe("models/orderModel", () => {
  it("validates a mixed order with defaults", () => {
    const order = new Order({
      user: new mongoose.Types.ObjectId(),
      email: "buyer@example.com",
      orderType: "mixed",
      amount: 45.5,
      products: [
        {
          _id: new mongoose.Types.ObjectId(),
          productName: "Wizolingo Hoodie",
          productType: "merch",
          price: 40,
          quantity: 1,
        },
      ],
    });

    expect(order.validateSync()).toBeUndefined();
    expect(order.paymentMethod).toBe("paypal");
    expect(order.paymentStatus).toBe("pending");
    expect(order.status).toBe("Processing");
    expect(order.downloadUnlocked).toBe(false);
    expect(order.currency).toBe("USD");
  });

  it("rejects invalid orderType and status enum", () => {
    const order = new Order({
      orderType: "subscription",
      status: "Unknown",
    });
    const err = order.validateSync();
    expect(err.errors.user).toBeDefined();
    expect(err.errors.email).toBeDefined();
    expect(err.errors.amount).toBeDefined();
    expect(err.errors.orderType).toBeDefined();
    expect(err.errors.status).toBeDefined();
  });
});

