const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { body } = require("express-validator");
const User = require("../models/User");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");
const { ok, fail } = require("../utils/respond");

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many login attempts. Try again later.", data: null }
});

function sign(user) {
  return jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET || "dev-secret", {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  });
}

router.post(
  "/register",
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
  validate,
  asyncHandler(async (req, res) => {
    const { name, email, password, mobile } = req.body;
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return fail(res, "Email already registered", 409);
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash, mobile });
    const token = sign(user);
    return ok(res, "Registered successfully", { token, user: { id: user._id, name, email: user.email } }, 201);
  })
);

router.post(
  "/login",
  loginLimiter,
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
  validate,
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email.toLowerCase() });
    if (!user) return fail(res, "Invalid email or password", 401);
    const valid = await bcrypt.compare(req.body.password, user.passwordHash);
    if (!valid) return fail(res, "Invalid email or password", 401);
    return ok(res, "Logged in successfully", {
      token: sign(user),
      user: { id: user._id, name: user.name, email: user.email }
    });
  })
);

module.exports = router;
