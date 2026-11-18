// middlewares/adminMiddleware.js
module.exports = (req, res, next) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).send({
        success: false,
        message: "Access denied. Admins only.",
      });
    }
    next();
  } catch (error) {
    res.status(401).send({
      success: false,
      message: error.message,
    });
  }
};

