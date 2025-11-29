// src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Stack,
  IconButton,
  Tooltip,
} from "@mui/material";

import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

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

  const [revealed, setRevealed] = useState({}); // password visibility map

  useEffect(() => {
    if (!userId) navigate("/login");
  }, [userId, navigate]);

  const unlock = async () => {
    if (!userId || !masterPassword) return;
    try {
      const res = await api.post("/passwords/get-secure", {
        userId,
        masterPassword,
      });

      setItems(res.data.items || []);
      setIsUnlocked(true);
      setMessage("");
    } catch (e) {
      const errMsg =
        e.response?.data?.error ||
        "Failed to unlock. Check your master password.";
      setMessage(errMsg);
      setIsUnlocked(false);
    }
  };

  const handleAdd = async () => {
    if (!domain || !username || !password) return;

    try {
      await api.post("/password/add-secure", {
        userId,
        masterPassword,
        domain,
        username,
        password,
      });

      setDomain("");
      setUsername("");
      setPassword("");
      await unlock();
    } catch (e) {
      const errMsg = e.response?.data?.error || "Failed to add credential.";
      setMessage(errMsg);
    }
  };

  const handleDelete = async (domainToDelete) => {
    try {
      await api.post("/password/delete-secure", {
        userId,
        masterPassword,
        domain: domainToDelete,
      });

      await unlock();
    } catch (e) {
      const errMsg =
        e.response?.data?.error || "Failed to delete credential.";
      setMessage(errMsg);
    }
  };

  const toggleReveal = (domainName) => {
    setRevealed((prev) => ({
      ...prev,
      [domainName]: !prev[domainName],
    }));
  };

  const handleLogout = () => {
    setMasterPassword("");
    setItems([]);
    setIsUnlocked(false);
    navigate("/login");
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", background: "white" }}>
      {/* SIDEBAR */}
      <Box
        sx={{
          width: 240,
          background: "linear-gradient(135deg, #d12f6b, #ff78a5)",
          color: "white",
          p: 3,
          display: "flex",
          flexDirection: "column",
          gap: 3,
        }}
      >
        <Typography variant="h5" fontWeight="bold">
          Vault
        </Typography>

        <Button
          variant="outlined"
          sx={{ color: "white", borderColor: "white" }}
        >
          Dashboard
        </Button>

        <Button
          variant="outlined"
          sx={{ color: "white", borderColor: "white" }}
        >
          Settings
        </Button>

        <Button
          variant="outlined"
          sx={{ color: "white", borderColor: "white" }}
          onClick={handleLogout}
        >
          Logout
        </Button>
      </Box>

      {/* MAIN */}
      <Box sx={{ flexGrow: 1, p: 5 }}>
        <Typography
          variant="h4"
          fontWeight="bold"
          mb={3}
          sx={{ color: "#b01756" }}
        >
          Password Manager 🔐
        </Typography>

        {/* Unlock Panel */}
        <Paper sx={{ p: 3, mb: 4, borderLeft: "5px solid #d12f6b" }}>
          <Typography variant="h6" mb={2} sx={{ color: "#d12f6b" }}>
            Unlock Vault
          </Typography>

          <Stack spacing={2}>
            <TextField
              label="Master Password (not stored)"
              type="password"
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
            />

            <Button
              variant="contained"
              sx={{ background: "#d12f6b" }}
              onClick={unlock}
            >
              Unlock
            </Button>

            {message && <Typography color="error">{message}</Typography>}
          </Stack>
        </Paper>

        {/* SHOW ONLY IF UNLOCKED */}
        {isUnlocked && (
          <>
            {/* Add Credential */}
            <Paper sx={{ p: 3, mb: 4, borderLeft: "5px solid #ff78a5" }}>
              <Typography variant="h6" mb={2} sx={{ color: "#ff78a5" }}>
                Add New Credential
              </Typography>

              <Stack spacing={2}>
                <TextField
                  label="Domain"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                />
                <TextField
                  label="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                <TextField
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <Button
                  variant="contained"
                  sx={{ background: "#ff78a5" }}
                  onClick={handleAdd}
                >
                  Add
                </Button>
              </Stack>
            </Paper>

            {/* Password List */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" mb={2} sx={{ color: "#b01756" }}>
                Saved Passwords
              </Typography>

              {items.length === 0 && (
                <Typography>No passwords saved yet.</Typography>
              )}

              <Stack spacing={2}>
                {items.map((item) => (
                  <Paper
                    key={item.domain}
                    sx={{
                      p: 2,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderLeft: "5px solid #d12f6b",
                    }}
                  >
                    <Box>
                      <Typography>
                        <b>Domain:</b> {item.domain}
                      </Typography>
                      <Typography>
                        <b>Username:</b> {item.username}
                      </Typography>

                      <Typography sx={{ fontFamily: "monospace" }}>
                        <b>Password:</b>{" "}
                        {revealed[item.domain]
                          ? item.password
                          : "••••••••••"}
                      </Typography>
                    </Box>

                    <Stack direction="row" spacing={1}>
                      <Tooltip
                        title={revealed[item.domain] ? "Hide" : "Show"}
                      >
                        <IconButton
                          onClick={() => toggleReveal(item.domain)}
                          sx={{ color: "#d12f6b" }}
                        >
                          {revealed[item.domain] ? (
                            <VisibilityOffIcon />
                          ) : (
                            <VisibilityIcon />
                          )}
                        </IconButton>
                      </Tooltip>

                      <IconButton
                        color="error"
                        onClick={() => handleDelete(item.domain)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </Paper>
          </>
        )}
      </Box>
    </Box>
  );
}

export default Dashboard;
