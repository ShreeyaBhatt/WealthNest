const mongoose = require("mongoose");

const familySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  admin: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "Member" }],
  city: { type: String, trim: true },
  description: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Family", familySchema);
