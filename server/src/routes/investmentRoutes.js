const express = require("express");
const { body } = require("express-validator");
const Investment = require("../models/Investment");
const Transaction = require("../models/Transaction");
const Member = require("../models/Member");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");
const { ok, fail } = require("../utils/respond");

const router = express.Router();

router.get("/", asyncHandler(async (req, res) => {
  const query = req.query.familyId ? { familyId: req.query.familyId } : {};
  const investments = await Investment.find(query).populate("memberId").sort({ createdAt: -1 });
  ok(res, "Investments loaded", investments);
}));

router.post(
  "/",
  body("memberId").notEmpty().withMessage("Member is required"),
  body("type").isIn(["MF", "Stock", "FD", "PPF", "ELSS"]).withMessage("Invalid investment type"),
  body("name").trim().notEmpty().withMessage("Investment name is required"),
  validate,
  asyncHandler(async (req, res) => {
    const member = await Member.findById(req.body.memberId);
    if (!member) return fail(res, "Member not found", 404);
    const investment = await Investment.create({ ...req.body, familyId: member.familyId });
    ok(res, "Investment created", investment, 201);
  })
);

router.put("/:id", asyncHandler(async (req, res) => {
  const investment = await Investment.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!investment) return fail(res, "Investment not found", 404);
  ok(res, "Investment updated", investment);
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  const investment = await Investment.findByIdAndDelete(req.params.id);
  if (!investment) return fail(res, "Investment not found", 404);
  await Transaction.deleteMany({ investmentId: investment._id });
  ok(res, "Investment deleted", investment);
}));

module.exports = router;
