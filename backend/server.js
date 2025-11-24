const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const { Keychain } = require("./password-manager");

let keychain = null;
let masterPassword = null; // store only in memory

const app = express();
app.use(cors());
app.use(bodyParser.json());


// -------- INIT KEYCHAIN --------
app.post("/init", async (req, res) => {
    try {
        masterPassword = req.body.password;
        keychain = await Keychain.init(masterPassword);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.toString() });
    }
});


// -------- SET PASSWORD --------
app.post("/set", async (req, res) => {
    const { domain, password } = req.body;
    if (!keychain) return res.status(400).json({ error: "Keychain not initialized" });

    try {
        await keychain.set(domain, password);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.toString() });
    }
});


// -------- GET PASSWORD --------
app.post("/get", async (req, res) => {
    const { domain } = req.body;
    if (!keychain) return res.status(400).json({ error: "Keychain not initialized" });

    try {
        const pwd = await keychain.get(domain);
        res.json({ password: pwd });
    } catch (err) {
        res.status(500).json({ error: err.toString() });
    }
});


// -------- REMOVE PASSWORD --------
app.post("/remove", async (req, res) => {
    const { domain } = req.body;
    if (!keychain) return res.status(400).json({ error: "Keychain not initialized" });

    try {
        const removed = await keychain.remove(domain);
        res.json({ removed });
    } catch (err) {
        res.status(500).json({ error: err.toString() });
    }
});


// -------- DUMP KEYCHAIN --------
app.get("/dump", async (req, res) => {
    if (!keychain) return res.status(400).json({ error: "Keychain not initialized" });

    try {
        const [repr, checksum] = await keychain.dump();
        res.json({ repr, checksum });
    } catch (err) {
        res.status(500).json({ error: err.toString() });
    }
});


// -------- LOAD KEYCHAIN --------
app.post("/load", async (req, res) => {
    const { password, repr, checksum } = req.body;

    try {
        keychain = await Keychain.load(password, repr, checksum);
        masterPassword = password;
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.toString() });
    }
});


// -------- START SERVER --------
const PORT = 3001;
app.listen(PORT, () => {
    console.log("Backend running on http://localhost:" + PORT);
});
