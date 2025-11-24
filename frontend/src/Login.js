import React, { useState } from "react";
import axios from "axios";
import {
  Container,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Box
} from "@mui/material";

const API = "http://localhost:3001";

export default function Login({ onLogin }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const initKeychain = async () => {
    try {
      await axios.post(`${API}/init`, { password });
      onLogin(password);
    } catch (err) {
      setError("Initialization failed.");
    }
  };

  const loadKeychain = async () => {
    try {
      const { data } = await axios.get(`${API}/dump`);
      await axios.post(`${API}/load`, {
        password,
        repr: data.repr,
        checksum: data.checksum
      });
      onLogin(password);
    } catch (err) {
      setError("Incorrect master password.");
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 10 }}>
      <Card
        sx={{
          p: 4,
          boxShadow: 6,
          backgroundColor: "background.paper",
          borderRadius: 3,
        }}
      >
        <CardContent>
          <Typography
            variant="h4"
            sx={{
              color: "primary.main",
              fontWeight: 700,
              textAlign: "center",
              mb: 3
            }}
          >
            Secure Password Vault
          </Typography>

          <Box sx={{ my: 2 }}>
            <TextField
              fullWidth
              type="password"
              label="Master Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </Box>

          {error && (
            <Typography
              color="error"
              sx={{ mb: 2, fontWeight: 600 }}
            >
              {error}
            </Typography>
          )}

          <Box sx={{ display: "flex", gap: 2, justifyContent: "center", mt: 2 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={initKeychain}
            >
              Create New Vault
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              onClick={loadKeychain}
              sx={{
                borderWidth: 2,
                "&:hover": {
                  borderWidth: 2
                }
              }}
            >
              Unlock Existing
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}
