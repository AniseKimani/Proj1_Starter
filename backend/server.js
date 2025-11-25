// server.js
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const User = require("./models/User");
const { Keychain } = require("./password-manager");

const app = express();

// ---------- MIDDLEWARE ----------
app.use(cors({
  origin: "http://localhost:5173", // Vite frontend
  credentials: true
}));
app.use(express.json());

// ---------- MONGODB CONNECTION ----------
mongoose.connect("mongodb+srv://anisekimani:jeBtFIgxsxQ5YMSX@users.amkym5o.mongodb.net/?appName=Users")
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// ---------- SIGNUP ROUTE ----------
app.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Initialize new keychain
    const kc = await Keychain.init(password);
    const [json, checksum] = await kc.dump();

    // Create new user
    const user = await User.create({
      email,
      keychainJson: json,
      keychainChecksum: checksum
    });

    res.json({ success: true, userId: user._id });
  } catch (e) {
    console.error("Signup error:", e);
    res.status(500).json({ error: e.toString() });
  }
});

// ---------- LOGIN ROUTE ----------
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "No such user" });

    // Attempt to load keychain with password
    try {
      await Keychain.load(password, user.keychainJson, user.keychainChecksum);
    } catch {
      return res.status(400).json({ error: "Invalid password" });
    }

    // Success
    res.json({ success: true, userId: user._id });
  } catch (e) {
    console.error("Login error:", e);
    res.status(500).json({ error: e.toString() });
  }
});

// ---------- START SERVER ----------
const PORT = 4000;
app.listen(PORT, () => console.log(`✅ Backend running on :${PORT}`));
