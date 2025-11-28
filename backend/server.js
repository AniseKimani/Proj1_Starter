const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const User = require("./models/User");
const { Keychain } = require("./password-manager");

const app = express();

// ---------- MIDDLEWARE ----------
app.use(cors({
  origin: "http://localhost:5173",
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
    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "User already exists" });

    // Initialize new keychain
    const kc = await Keychain.init(password);

    // Create an initial index entry (empty list) so listing works later
    // We use a reserved domain name '__index__' that will be HMACed and encrypted via Keychain
    await kc.set("__index__", JSON.stringify([]));
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
    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "No such user" });

    try {
      await Keychain.load(password, user.keychainJson, user.keychainChecksum);
    } catch {
      return res.status(400).json({ error: "Invalid password" });
    }

    // Success: return userId (frontend will keep masterPassword in memory, not stored)
    res.json({ success: true, userId: user._id });
  } catch (e) {
    console.error("Login error:", e);
    res.status(500).json({ error: e.toString() });
  }
});

/*
  Secure endpoints that operate on the Keychain stored in DB.
  NOTE: All secure endpoints expect the client to provide the user's master password
  in the request body (masterPassword). We do NOT store master passwords in the DB or localStorage.
  The master password is used only to load the Keychain in memory on the server for the duration
  of the operation; the new keychain snapshot is saved back to DB after changes.
*/

// ---------- ADD CREDENTIAL (secure) ----------
app.post("/password/add-secure", async (req, res) => {
  const { userId, masterPassword, domain, username, password } = req.body;
  if (!userId || !masterPassword || !domain || !username || !password) {
    return res.status(400).json({ error: "userId, masterPassword, domain, username and password are required" });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Load keychain
    const kc = await Keychain.load(masterPassword, user.keychainJson, user.keychainChecksum);

    // Store username+password as a JSON string under domain
    const payload = JSON.stringify({ username, password });
    await kc.set(domain, payload);

    // update encrypted index: get list, add domain (if not present)
    let indexList = [];
    try {
      const idxRaw = await kc.get("__index__");
      indexList = idxRaw ? JSON.parse(idxRaw) : [];
    } catch (e) {
      indexList = [];
    }
    if (!indexList.includes(domain)) {
      indexList.push(domain);
      await kc.set("__index__", JSON.stringify(indexList));
    }

    // dump and save
    const [newJson, newChecksum] = await kc.dump();
    user.keychainJson = newJson;
    user.keychainChecksum = newChecksum;
    await user.save();

    res.json({ success: true });
  } catch (e) {
    console.error("Add-secure error:", e);
    res.status(500).json({ error: e.toString() });
  }
});

// ---------- GET ALL CREDENTIALS (secure) ----------
app.post("/passwords/get-secure", async (req, res) => {
  const { userId, masterPassword } = req.body;
  if (!userId || !masterPassword) return res.status(400).json({ error: "userId and masterPassword are required" });

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const kc = await Keychain.load(masterPassword, user.keychainJson, user.keychainChecksum);

    // load index
    let indexList = [];
    try {
      const idxRaw = await kc.get("__index__");
      indexList = idxRaw ? JSON.parse(idxRaw) : [];
    } catch (e) {
      indexList = [];
    }

    // for each domain decrypt entry and parse
    const items = [];
    for (const domain of indexList) {
      try {
        const raw = await kc.get(domain); // JSON string
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        items.push({
          domain,
          username: parsed.username,
          password: parsed.password
        });
      } catch (e) {
        // if a particular entry fails to decrypt, skip it but log
        console.warn(`Failed to decrypt entry for domain ${domain}:`, e);
      }
    }

    res.json({ items });
  } catch (e) {
    console.error("Get-secure error:", e);
    res.status(500).json({ error: e.toString() });
  }
});

// ---------- DELETE CREDENTIAL (secure) ----------
app.post("/password/delete-secure", async (req, res) => {
  const { userId, masterPassword, domain } = req.body;
  if (!userId || !masterPassword || !domain) {
    return res.status(400).json({ error: "userId, masterPassword and domain are required" });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const kc = await Keychain.load(masterPassword, user.keychainJson, user.keychainChecksum);

    // remove domain entry
    const removed = await kc.remove(domain);

    // update index
    let indexList = [];
    try {
      const idxRaw = await kc.get("__index__");
      indexList = idxRaw ? JSON.parse(idxRaw) : [];
    } catch (e) {
      indexList = [];
    }
    indexList = indexList.filter(d => d !== domain);
    await kc.set("__index__", JSON.stringify(indexList));

    // dump and save
    const [newJson, newChecksum] = await kc.dump();
    user.keychainJson = newJson;
    user.keychainChecksum = newChecksum;
    await user.save();

    res.json({ success: true, removed });
  } catch (e) {
    console.error("Delete-secure error:", e);
    res.status(500).json({ error: e.toString() });
  }
});

// ---------- START SERVER ----------
const PORT = 4000;
app.listen(PORT, () => console.log(`✅ Backend running on :${PORT}`));
