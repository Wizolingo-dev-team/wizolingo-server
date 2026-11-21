// tests/unit/utils/otpGenerator.test.js
const { generateOTP } = require("../../../utils/otpGenerator");

describe("utils/otpGenerator", () => {
  it("generates a 6-digit numeric string", () => {
    const otp = generateOTP();
    expect(typeof otp).toBe("string");
    expect(otp).toMatch(/^\d{6}$/);
  });

  it("generates varying OTPs across calls", () => {
    const codes = new Set(Array.from({ length: 15 }, () => generateOTP()));
    expect(codes.size).toBeGreaterThan(1);
  });
});

