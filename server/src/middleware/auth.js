const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { fail } = require("../utils/respond");

async function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return fail(res, "Authentication token required", 401);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    const user = await User.findById(decoded.id).select("-passwordHash");
    if (!user) return fail(res, "User not found", 401);
    req.user = user;
    next();
  } catch (error) {
    return fail(res, "Invalid or expired token", 401);
  }
}

module.exports = auth;
