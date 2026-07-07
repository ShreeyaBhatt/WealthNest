const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema({
  familyId: { type: mongoose.Schema.Types.ObjectId, ref: "Family", required: true, index: true },
  name: { type: String, required: true, trim: true },
  relationship: { type: String, required: true, trim: true },
  dob: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Member", memberSchema);
