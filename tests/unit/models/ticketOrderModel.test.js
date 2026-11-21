// tests/unit/models/ticketOrderModel.test.js
const mongoose = require("mongoose");
const TicketOrder = require("../../../models/ticketOrderModel");

describe("models/ticketOrderModel", () => {
  it("generates unique WIZ-TKT-* ticketCode and validates fields", () => {
    const order = new TicketOrder({
      event: new mongoose.Types.ObjectId(),
      user: new mongoose.Types.ObjectId(),
      attendeeName: "John Doe",
      email: "JOHN@Example.com",
      tickets: [
        {
          tierId: new mongoose.Types.ObjectId(),
          tierName: "General Admission",
          unitPrice: 50,
          quantity: 2,
          subtotal: 100,
        },
      ],
      totalAmount: 100,
    });

    expect(order.validateSync()).toBeUndefined();
    expect(order.ticketCode).toMatch(/^WIZ-TKT-[A-F0-9]{8}$/);
    expect(order.email).toBe("john@example.com");
    expect(order.paymentMethod).toBe("paypal");
    expect(order.status).toBe("Processing");
  });
});

