const express = require("express");
const axios = require("axios");
const Investment = require("../models/Investment");
const Transaction = require("../models/Transaction");
const Insight = require("../models/Insight");
const asyncHandler = require("../utils/asyncHandler");
const { ok, fail } = require("../utils/respond");

const router = express.Router();

const fastapi = () => process.env.FASTAPI_URL || "http://localhost:8000";

router.post("/save", asyncHandler(async (req, res) => {
  const { familyId, insight } = req.body;
  if (!familyId || !insight) return fail(res, "familyId and insight are required", 422);
  const saved = await Insight.findOneAndUpdate(
    { familyId },
    { familyId, insight, updatedAt: new Date() },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  ok(res, "Insight saved", saved);
}));

router.get("/saved", asyncHandler(async (req, res) => {
  const saved = await Insight.findOne({ familyId: req.query.familyId });
  ok(res, "Saved insight loaded", saved);
}));

router.get("/sip-forecasts", asyncHandler(async (req, res) => {
  const investments = await Investment.find({
    familyId: req.query.familyId,
    monthlySip: { $gt: 0 },
    sipCategory: { $in: ["nifty50", "largecap", "elss", "debt"] }
  }).populate("memberId");

  const results = [];
  for (const inv of investments) {
    const buyCount = await Transaction.countDocuments({ investmentId: inv._id, type: "BUY" });
    if (buyCount < 2) continue;
    const payload = {
      category: inv.sipCategory,
      monthly_sip: inv.monthlySip,
      duration_months: 120,
      goal_amount: inv.goalAmount || 0
    };
    try {
      const { data } = await axios.post(`${fastapi()}/ml/sip-forecast`, payload, { timeout: 4000 });
      results.push({
        investmentId: inv._id,
        investmentName: inv.name,
        memberName: inv.memberId?.name,
        monthlySip: inv.monthlySip,
        goalAmount: inv.goalAmount || 0,
        category: inv.sipCategory,
        forecast: data
      });
    } catch (error) {
      results.push({
        investmentId: inv._id,
        investmentName: inv.name,
        memberName: inv.memberId?.name,
        monthlySip: inv.monthlySip,
        goalAmount: inv.goalAmount || 0,
        category: inv.sipCategory,
        forecast: null,
        error: "ML service unavailable"
      });
    }
  }
  ok(res, "SIP forecasts loaded", results);
}));

module.exports = router;
