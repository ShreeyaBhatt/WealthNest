const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  investmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Investment", required: true, index: true },
  type: { type: String, enum: ["BUY", "SELL", "DIVIDEND", "DEPOSIT"], required: true },
  date: { type: Date, required: true },
  amount: { type: Number, required: true, min: 0 },
  units: { type: Number, default: 0, min: 0 },
  price: { type: Number, default: 0, min: 0 },
  createdAt: { type: Date, default: Date.now }
});

transactionSchema.index({ investmentId: 1, date: 1 });

module.exports = mongoose.model("Transaction", transactionSchema);
