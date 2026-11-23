// tests/unit/models/bookingModel.test.js
const Booking = require("../../../models/bookingModel");

describe("models/bookingModel", () => {
  it("validates valid booking model with defaults", () => {
    const booking = new Booking({
      fullName: "John Doe",
      email: "john@example.com",
      phone: "+1234567890",
      eventType: "concert",
      eventDate: "2026-12-25",
      country: "London, UK",
      message: "We would love to book Wiz Ofuasia for our annual festival.",
    });

    expect(booking.validateSync()).toBeUndefined();
    expect(booking.status).toBe("pending");
    expect(booking.eventType).toBe("concert");
  });

  it("fails validation when fullName, email or message is missing", () => {
    const booking = new Booking({});
    const err = booking.validateSync();
    expect(err.errors.fullName).toBeDefined();
    expect(err.errors.email).toBeDefined();
    expect(err.errors.message).toBeDefined();
  });
});

