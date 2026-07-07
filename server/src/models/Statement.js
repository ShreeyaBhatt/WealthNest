const mongoose = require("mongoose");

const statementSchema = new mongoose.Schema({
  familyId: { type: mongoose.Schema.Types.ObjectId, ref: "Family", required: true, index: true },
  memberId: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true, index: true },
  filePath: { type: String },
  parsedData: { type: Object, required: true },
  status: { type: String, enum: ["parsed", "imported", "failed"], default: "parsed" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Statement", statementSchema);
