const express = require("express");
const { body } = require("express-validator");
const Family = require("../models/Family");
const Member = require("../models/Member");
const Investment = require("../models/Investment");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");
const { ok, fail } = require("../utils/respond");

const router = express.Router();

router.get("/", asyncHandler(async (req, res) => {
  const families = await Family.find({ admin: req.user._id }).populate("members").sort({ createdAt: -1 });
  ok(res, "Families loaded", families);
}));

router.post(
  "/",
  body("name").trim().notEmpty().withMessage("Family name is required"),
  validate,
  asyncHandler(async (req, res) => {
    const family = await Family.create({ ...req.body, admin: req.user._id });
    ok(res, "Family created", family, 201);
  })
);

router.put("/:id", asyncHandler(async (req, res) => {
  const family = await Family.findOneAndUpdate({ _id: req.params.id, admin: req.user._id }, req.body, { new: true });
  if (!family) return fail(res, "Family not found", 404);
  ok(res, "Family updated", family);
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  const family = await Family.findOneAndDelete({ _id: req.params.id, admin: req.user._id });
  if (!family) return fail(res, "Family not found", 404);
  await Member.deleteMany({ familyId: family._id });
  await Investment.deleteMany({ familyId: family._id });
  ok(res, "Family deleted", family);
}));

router.get("/:id/members", asyncHandler(async (req, res) => {
  const members = await Member.find({ familyId: req.params.id }).sort({ createdAt: 1 });
  ok(res, "Members loaded", members);
}));

router.post(
  "/:id/members",
  body("name").trim().notEmpty().withMessage("Member name is required"),
  body("relationship").trim().notEmpty().withMessage("Relationship is required"),
  body("dob").isISO8601().withMessage("DOB must be a valid date"),
  validate,
  asyncHandler(async (req, res) => {
    const family = await Family.findOne({ _id: req.params.id, admin: req.user._id });
    if (!family) return fail(res, "Family not found", 404);
    const member = await Member.create({ ...req.body, familyId: family._id });
    family.members.push(member._id);
    await family.save();
    ok(res, "Member created", member, 201);
  })
);

router.put("/:id/members/:memberId", asyncHandler(async (req, res) => {
  const member = await Member.findOneAndUpdate({ _id: req.params.memberId, familyId: req.params.id }, req.body, { new: true });
  if (!member) return fail(res, "Member not found", 404);
  ok(res, "Member updated", member);
}));

router.delete("/:id/members/:memberId", asyncHandler(async (req, res) => {
  const hasInvestments = await Investment.exists({ memberId: req.params.memberId });
  if (hasInvestments) return fail(res, "Cannot delete a member with investments", 400);
  const member = await Member.findOneAndDelete({ _id: req.params.memberId, familyId: req.params.id });
  if (!member) return fail(res, "Member not found", 404);
  await Family.findByIdAndUpdate(req.params.id, { $pull: { members: member._id } });
  ok(res, "Member deleted", member);
}));

module.exports = router;
