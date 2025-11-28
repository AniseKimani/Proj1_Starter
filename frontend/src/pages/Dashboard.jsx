// src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { Box, Button, TextField, Typography, Paper, Stack, IconButton } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();
  const userId = localStorage.getItem("userId");

  const [masterPassword, setMasterPassword] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);

  const [domain, setDomain] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!userId) {
      navigate("/login");
      return;
    }
    // do not auto-fetch until user unlocks with master password
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Unlock (fetch all credentials) with master password
  const unlock = async () => {
    if (!userId || !masterPassword) return;
    try {
      const res = await api.post("/passwords/get-secure", { userId, masterPassword });
      setItems(res.data.items || []);
      setIsUnlocked(true);
      setMessage("");
    } catch (e) {
      console.error("Unlock error:", e);
      const errMsg = e.response?.data?.error || "Failed to unlock. Check your master password.";
      setMessage(errMsg);
      setIsUnlocked(false);
    }
  };

  // ---------------- ADD PASSWORD ----------------
  const handleAdd = async () => {
    if (!domain || !username || !password) return;
    if (!userId || !masterPassword) {
      setMessage("Enter master password and unlock first.");
      return;
    }

    try {
      await api.post("/password/add-secure", { userId, masterPassword, domain, username, password });
      setDomain("");
      setUsername("");
      setPassword("");
      await unlock(); // refresh list
    } catch (e) {
      console.error("Add error:", e);
      const errMsg = e.response?.data?.error || "Failed to add credential.";
      setMessage(errMsg);
    }
  };

  // ---------------- DELETE PASSWORD ----------------
  const handleDelete = async (domainToDelete) => {
    if (!userId || !masterPassword) {
      setMessage("Enter master password and unlock first.");
      return;
    }

    try {
      await api.post("/password/delete-secure", { userId, masterPassword, domain: domainToDelete });
      await unlock();
    } catch (e) {
      console.error("Delete error:", e);
      const errMsg = e.response?.data?.error || "Failed to delete credential.";
      setMessage(errMsg);
    }
  };

  // ---------------- LOGOUT ----------------
  const handleLogout = () => {
    // clear only client-side session info; do NOT store masterPassword - just clear it
    setMasterPassword("");
    setIsUnlocked(false);
    setItems([]);
    // optionally redirect to login
    navigate("/login");
  };

  return (
    <Box sx={{ maxWidth: 700, mx: "auto", mt: 6 }}>
      <Typography variant="h4" fontWeight="bold" textAlign="center" mb={3}>
        Password Manager 🔐
      </Typography>

      {/* Unlock panel */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" mb={2}>
          Unlock Vault
        </Typography>
        <Stack spacing={2}>
          <TextField
            label="Master Password (not stored)"
            type="password"
            value={masterPassword}
            onChange={(e) => setMasterPassword(e.target.value)}
          />
          <Button variant="contained" onClick={unlock}>Unlock</Button>
          <Button variant="outlined" onClick={handleLogout}>Logout</Button>

          {message && <Typography color="error">{message}</Typography>}
        </Stack>
      </Paper>

      {isUnlocked && (
        <>
          {/* ADD FORM */}
          <Paper sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" mb={2}>Add New Credential</Typography>
            <Stack spacing={2}>
              <TextField label="Domain (e.g. facebook.com)" value={domain} onChange={(e) => setDomain(e.target.value)} />
              <TextField label="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
              <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <Button variant="contained" onClick={handleAdd}>Add Credential</Button>
            </Stack>
          </Paper>

          {/* PASSWORD LIST */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" mb={2}>Saved Passwords</Typography>

            {items.length === 0 && <Typography>No passwords saved yet.</Typography>}

            <Stack spacing={2}>
              {items.map((item) => (
                <Paper key={item.domain} sx={{ p: 2, display: "flex", justifyContent: "space-between" }}>
                  <Box>
                    <Typography><b>Domain:</b> {item.domain}</Typography>
                    <Typography><b>Username:</b> {item.username}</Typography>
                    <Typography><b>Password:</b> {item.password}</Typography>
                  </Box>

                  <IconButton color="error" onClick={() => handleDelete(item.domain)}>
                    <DeleteIcon />
                  </IconButton>
                </Paper>
              ))}
            </Stack>
          </Paper>
        </>
      )}
    </Box>
  );
}

export default Dashboard;
