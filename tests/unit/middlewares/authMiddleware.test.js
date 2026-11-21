// tests/unit/middlewares/authMiddleware.test.js
const jwt = require("jsonwebtoken");
const authMiddleware = require("../../../middlewares/authMiddleware");

const createMockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res;
};

describe("middlewares/authMiddleware", () => {
  it("returns 401 when Authorization header is missing", () => {
    const req = { headers: {} };
    const res = createMockRes();
    const next = vi.fn();

    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "No token provided. Please login to continue.",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when token format is not Bearer <token>", () => {
    const req = { headers: { authorization: "Basic abc" } };
    const res = createMockRes();
    const next = vi.fn();

    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 on invalid token", () => {
    const req = { headers: { authorization: "Bearer invalid.jwt.token" } };
    const res = createMockRes();
    const next = vi.fn();

    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Invalid token. Access denied.",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 on expired token", () => {
    const expired = jwt.sign(
      { userId: "123", role: "user" },
      process.env.JWT_SECRET,
      { expiresIn: -10 }
    );
    const req = { headers: { authorization: `Bearer ${expired}` } };
    const res = createMockRes();
    const next = vi.fn();

    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Your session has expired. Please login again.",
    });
  });

  it("attaches req.user and req.body.userId and calls next() for valid token", () => {
    const token = jwt.sign(
      { userId: "user123", role: "user" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = createMockRes();
    const next = vi.fn();

    authMiddleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user.userId).toBe("user123");
    expect(req.body.userId).toBe("user123");
  });
});

