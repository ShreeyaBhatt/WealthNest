const express = require("express");
const Investment = require("../models/Investment");
const Statement = require("../models/Statement");
const Transaction = require("../models/Transaction");
const asyncHandler = require("../utils/asyncHandler");
const { ok, fail } = require("../utils/respond");
const { recalculateInvestment } = require("../utils/portfolio");

const router = express.Router();

router.post("/import", asyncHandler(async (req, res) => {
  const { familyId, memberId, parsedRows, filePath } = req.body;
  if (!familyId || !memberId || !Array.isArray(parsedRows)) {
    return fail(res, "familyId, memberId and parsedRows are required", 422);
  }

  const statement = await Statement.create({
    familyId,
    memberId,
    filePath,
    parsedData: { rows: parsedRows },
    status: "imported"
  });

  const createdInvestments = new Map();
  let transactionCount = 0;

  for (const row of parsedRows) {
    const fundName = row.fundName || row.scheme || "Imported Mutual Fund";
    let investment = createdInvestments.get(fundName);
    if (!investment) {
      investment = await Investment.findOne({ familyId, memberId, name: fundName });
      if (!investment) {
        investment = await Investment.create({
          familyId,
          memberId,
          name: fundName,
          type: fundName.toLowerCase().includes("elss") ? "ELSS" : "MF",
          sipCategory: fundName.toLowerCase().includes("elss") ? "elss" : "largecap",
          monthlySip: 0
        });
      }
      createdInvestments.set(fundName, investment);
    }

    const typeMap = { redemption: "SELL", sell: "SELL", dividend: "DIVIDEND", purchase: "BUY", buy: "BUY" };
    const txType = typeMap[String(row.transactionType || row.type || "buy").toLowerCase()] || "BUY";
    await Transaction.create({
      investmentId: investment._id,
      type: txType,
      date: row.date || new Date(),
      amount: Number(row.amount || 0),
      units: Number(row.units || 0),
      price: Number(row.nav || row.price || 0)
    });
    transactionCount += 1;
    if (txType !== "DIVIDEND") await recalculateInvestment(investment._id);
  }

  ok(res, "Statement imported", {
    statement,
    investmentsCreatedOrUpdated: createdInvestments.size,
    transactionsCreated: transactionCount
  }, 201);
}));

module.exports = router;
