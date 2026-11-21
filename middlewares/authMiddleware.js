// middlewares/authMiddleware.js
const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).send({
        success: false,
        message: "No token provided. Please login to continue.",
      });
    }

    const tokenParts = authHeader.split(" ");
    if (tokenParts.length !== 2 || tokenParts[0] !== "Bearer") {
      return res.status(401).send({
        success: false,
        message: "Invalid token format. Format should be 'Bearer <token>'",
      });
    }

    const token = tokenParts[1];
    const decryptedToken = jwt.verify(token, process.env.JWT_SECRET);

    if (!req.body) {
      req.body = {};
    }
    if (!req.body.userId) {
      req.body.userId = decryptedToken.userId;
    }
    req.user = decryptedToken;

    next();
  } catch (error) {
    let friendlyMessage = "Authentication failed";

    if (error.name === "TokenExpiredError") {
      friendlyMessage = "Your session has expired. Please login again.";
    } else if (error.name === "JsonWebTokenError") {
      friendlyMessage = "Invalid token. Access denied.";
    }

    res.status(401).send({
      success: false,
      message: friendlyMessage,
    });
  }
};

