const express = require("express");
const { body } = require("express-validator");
const Investment = require("../models/Investment");
const Transaction = require("../models/Transaction");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");
const { ok, fail } = require("../utils/respond");
const { recalculateInvestment } = require("../utils/portfolio");

const router = express.Router();

router.get("/", asyncHandler(async (req, res) => {
  const investmentFilter = req.query.investmentId ? { investmentId: req.query.investmentId } : {};
  const txns = await Transaction.find(investmentFilter).populate("investmentId").sort({ date: -1, createdAt: -1 });
  ok(res, "Transactions loaded", txns);
}));

router.post(
  "/",
  body("investmentId").notEmpty().withMessage("Investment is required"),
  body("type").isIn(["BUY", "SELL", "DIVIDEND", "DEPOSIT"]).withMessage("Invalid transaction type"),
  body("date").isISO8601().withMessage("Valid transaction date is required"),
  body("amount").isFloat({ min: 0 }).withMessage("Amount must be positive"),
  validate,
  asyncHandler(async (req, res) => {
    const investment = await Investment.findById(req.body.investmentId);
    if (!investment) return fail(res, "Investment not found", 404);
    if (req.body.type === "SELL" && Number(req.body.units || 0) > investment.units) {
      return fail(res, "SELL quantity cannot exceed current holding", 400);
    }
    const tx = await Transaction.create(req.body);
    const updatedInvestment = await recalculateInvestment(investment._id);
    ok(res, "Transaction created", { transaction: tx, investment: updatedInvestment }, 201);
  })
);

router.put("/:id", asyncHandler(async (req, res) => {
  const existing = await Transaction.findById(req.params.id);
  if (!existing) return fail(res, "Transaction not found", 404);
  const investment = await Investment.findById(existing.investmentId);
  if (!investment) return fail(res, "Investment not found", 404);
  if (req.body.type === "SELL" && Number(req.body.units || existing.units) > investment.units + existing.units) {
    return fail(res, "SELL quantity cannot exceed current holding", 400);
  }
  const tx = await Transaction.findByIdAndUpdate(req.params.id, req.body, { new: true });
  const updatedInvestment = await recalculateInvestment(tx.investmentId);
  ok(res, "Transaction updated", { transaction: tx, investment: updatedInvestment });
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  const tx = await Transaction.findByIdAndDelete(req.params.id);
  if (!tx) return fail(res, "Transaction not found", 404);
  const updatedInvestment = await recalculateInvestment(tx.investmentId);
  ok(res, "Transaction deleted", { transaction: tx, investment: updatedInvestment });
}));

module.exports = router;
