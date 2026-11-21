// tests/unit/helpers/dbErrorHandler.test.js
const { errorHandler } = require("../../../helpers/dbErrorHandler");

describe("helpers/dbErrorHandler", () => {
  it("formats duplicate key error (11000) with field name", () => {
    const err = {
      code: 11000,
      message: "E11000 duplicate key error collection: db.users index: .$email_1 dup key",
    };
    expect(errorHandler(err)).toBe("Email already exists");
  });

  it("handles progressPercentage duplicate key error", () => {
    const err = {
      code: 11001,
      message: "duplicate key progressPercentage",
    };
    expect(errorHandler(err)).toBe("Progress percentage already exists");
  });

  it("falls back for unknown error code", () => {
    expect(errorHandler({ code: 99999 })).toBe("Something went wrong");
  });

  it("extracts mongoose validation error message", () => {
    const err = {
      errors: {
        email: { message: "Email is required" },
      },
    };
    expect(errorHandler(err)).toBe("Email is required");
  });

  it("returns error.message when no code or errors object", () => {
    expect(errorHandler({ message: "Custom failure" })).toBe("Custom failure");
  });
});

