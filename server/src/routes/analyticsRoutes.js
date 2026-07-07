const express = require("express");
const Investment = require("../models/Investment");
const Transaction = require("../models/Transaction");
const asyncHandler = require("../utils/asyncHandler");
const { ok } = require("../utils/respond");
const { getDashboard } = require("../utils/portfolio");

const router = express.Router();

router.get("/dashboard", asyncHandler(async (req, res) => {
  const data = await getDashboard(req.query.familyId);
  ok(res, "Dashboard analytics loaded", data);
}));

router.get("/trends", asyncHandler(async (req, res) => {
  const investments = await Investment.find({ familyId: req.query.familyId }).select("_id");
  const ids = investments.map((inv) => inv._id);
  const txns = await Transaction.find({ investmentId: { $in: ids } }).sort({ date: 1 });
  let running = 0;
  const byDate = new Map();

  txns.forEach((tx) => {
    if (tx.type === "BUY" || tx.type === "DEPOSIT") running += tx.amount;
    if (tx.type === "SELL") running -= tx.amount;
    if (tx.type === "DIVIDEND") running += tx.amount;
    byDate.set(tx.date.toISOString().slice(0, 10), Number(running.toFixed(2)));
  });

  const data = Array.from(byDate.entries()).map(([date, totalValue]) => ({ date, totalValue }));
  ok(res, "Portfolio trend loaded", data);
}));

module.exports = router;
