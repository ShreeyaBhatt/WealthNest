const Investment = require("../models/Investment");
const Transaction = require("../models/Transaction");
const Member = require("../models/Member");

const assetCategory = {
  MF: "Equity",
  Stock: "Equity",
  FD: "FixedIncome",
  PPF: "Retirement",
  ELSS: "ELSS"
};

function ageFromDob(dob) {
  const now = new Date();
  const birth = new Date(dob);
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

async function recalculateInvestment(investmentId) {
  const investment = await Investment.findById(investmentId);
  if (!investment) throw new Error("Investment not found");

  const txns = await Transaction.find({ investmentId }).sort({ date: 1, createdAt: 1 });
  let units = 0;
  let investedAmount = 0;
  let latestPrice = investment.avgPrice || 0;

  for (const tx of txns) {
    if (tx.type === "BUY") {
      units += tx.units;
      investedAmount += tx.amount;
      if (tx.price > 0) latestPrice = tx.price;
    }
    if (tx.type === "SELL") {
      const runningAvg = units > 0 ? investedAmount / units : 0;
      units -= tx.units;
      investedAmount = Math.max(0, investedAmount - runningAvg * tx.units);
      if (tx.price > 0) latestPrice = tx.price;
    }
    if (tx.type === "DEPOSIT") {
      investedAmount += tx.amount;
      units = tx.units > 0 ? units + tx.units : units;
      if (tx.price > 0) latestPrice = tx.price;
    }
  }

  const avgPrice = units > 0 ? investedAmount / units : 0;
  investment.units = Number(units.toFixed(6));
  investment.investedAmount = Number(investedAmount.toFixed(2));
  investment.avgPrice = Number(avgPrice.toFixed(4));
  investment.currentValue = Number((investment.units * latestPrice).toFixed(2));
  await investment.save();
  return investment;
}

async function getDashboard(familyId) {
  const investments = await Investment.find({ familyId }).populate("memberId");
  const totalValue = investments.reduce((sum, inv) => sum + inv.currentValue, 0);
  const totalInvested = investments.reduce((sum, inv) => sum + (inv.investedAmount || inv.avgPrice * inv.units), 0);
  const gainLoss = totalValue - totalInvested;
  const gainLossPercent = totalInvested > 0 ? (gainLoss / totalInvested) * 100 : 0;

  const allocationMap = new Map();
  investments.forEach((inv) => {
    const label = assetCategory[inv.type] || inv.type;
    allocationMap.set(label, (allocationMap.get(label) || 0) + inv.currentValue);
  });
  const allocation = Array.from(allocationMap.entries()).map(([type, value]) => ({
    type,
    value: Number(value.toFixed(2)),
    percentage: totalValue ? Number(((value / totalValue) * 100).toFixed(2)) : 0
  }));

  const memberMap = new Map();
  investments.forEach((inv) => {
    const id = String(inv.memberId?._id || inv.memberId);
    const current = memberMap.get(id) || { memberId: id, name: inv.memberId?.name || "Unknown", value: 0 };
    current.value += inv.currentValue;
    memberMap.set(id, current);
  });
  const memberBreakdown = Array.from(memberMap.values()).map((row) => ({
    ...row,
    value: Number(row.value.toFixed(2)),
    percentage: totalValue ? Number(((row.value / totalValue) * 100).toFixed(2)) : 0
  }));

  const investmentReturns = investments.map((inv) => {
    const invested = inv.investedAmount || inv.avgPrice * inv.units;
    return {
      id: inv._id,
      name: inv.name,
      type: inv.type,
      memberName: inv.memberId?.name,
      gainLossPercent: invested > 0 ? Number((((inv.currentValue - invested) / invested) * 100).toFixed(2)) : 0
    };
  });

  return {
    totalValue: Number(totalValue.toFixed(2)),
    totalInvested: Number(totalInvested.toFixed(2)),
    gainLoss: Number(gainLoss.toFixed(2)),
    gainLossPercent: Number(gainLossPercent.toFixed(2)),
    activeInvestments: investments.filter((inv) => inv.currentValue > 0).length,
    allocation,
    memberBreakdown,
    investmentReturns
  };
}

async function getPortfolioSummary(familyId) {
  const dashboard = await getDashboard(familyId);
  const investments = await Investment.find({ familyId }).sort({ currentValue: -1 }).limit(5);
  const members = await Member.find({ familyId });
  return {
    totalValue: dashboard.totalValue,
    totalInvested: dashboard.totalInvested,
    allocationPercentages: dashboard.allocation,
    topHoldings: investments.map((inv) => ({ name: inv.name, type: inv.type, currentValue: inv.currentValue })),
    members: members.map((m) => ({ name: m.name, relationship: m.relationship, age: ageFromDob(m.dob) }))
  };
}

module.exports = { recalculateInvestment, getDashboard, getPortfolioSummary, assetCategory, ageFromDob };
