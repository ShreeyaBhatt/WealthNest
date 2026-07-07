const mongoose = require("mongoose");

const investmentSchema = new mongoose.Schema({
  memberId: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true, index: true },
  familyId: { type: mongoose.Schema.Types.ObjectId, ref: "Family", required: true, index: true },
  type: { type: String, enum: ["MF", "Stock", "FD", "PPF", "ELSS"], required: true },
  name: { type: String, required: true, trim: true },
  units: { type: Number, default: 0, min: 0 },
  avgPrice: { type: Number, default: 0, min: 0 },
  currentValue: { type: Number, default: 0, min: 0 },
  investedAmount: { type: Number, default: 0, min: 0 },
  monthlySip: { type: Number, default: 0, min: 0 },
  sipCategory: { type: String, enum: ["nifty50", "largecap", "elss", "debt", ""], default: "" },
  goalAmount: { type: Number, min: 0 },
  createdAt: { type: Date, default: Date.now }
});

investmentSchema.index({ familyId: 1, memberId: 1 });

module.exports = mongoose.model("Investment", investmentSchema);
