// tests/unit/models/userModel.test.js
const User = require("../../../models/userModel");

describe("models/userModel", () => {
  it("validates a valid user and applies defaults", () => {
    const user = new User({
      firstName: "Wiz",
      lastName: "Ofuasia",
      email: "  FAN@Example.COM ",
      password: "Password123",
    });

    const err = user.validateSync();
    expect(err).toBeUndefined();
    expect(user.email).toBe("fan@example.com");
    expect(user.role).toBe("user");
    expect(user.isVerified).toBe(false);
    expect(user.avatar.public_id).toBe("default");
  });

  it("rejects invalid role enum and missing required fields", () => {
    const user = new User({ role: "superadmin" });
    const err = user.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.firstName).toBeDefined();
    expect(err.errors.lastName).toBeDefined();
    expect(err.errors.email).toBeDefined();
    expect(err.errors.password).toBeDefined();
    expect(err.errors.role).toBeDefined();
  });
});

