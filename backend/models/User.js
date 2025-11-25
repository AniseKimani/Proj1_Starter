const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  keychainJson: { type: String, required: true },     // encrypted blob
  keychainChecksum: { type: String, required: true }, // integrity
});

module.exports = mongoose.model("User", UserSchema);
