// tests/unit/middlewares/adminMiddleware.test.js
const adminMiddleware = require("../../../middlewares/adminMiddleware");

const createMockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res;
};

describe("middlewares/adminMiddleware", () => {
  it("returns 403 when user is not admin", () => {
    const req = { user: { userId: "u1", role: "user" } };
    const res = createMockRes();
    const next = vi.fn();

    adminMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Access denied. Admins only.",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when req.user is missing", () => {
    const req = {};
    const res = createMockRes();
    const next = vi.fn();

    adminMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() when req.user.role is admin", () => {
    const req = { user: { userId: "a1", role: "admin" } };
    const res = createMockRes();
    const next = vi.fn();

    adminMiddleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});

