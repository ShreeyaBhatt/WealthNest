const mongoose = require("mongoose");

const insightSchema = new mongoose.Schema({
  familyId: { type: mongoose.Schema.Types.ObjectId, ref: "Family", required: true, unique: true, index: true },
  insight: { type: Object, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Insight", insightSchema);
