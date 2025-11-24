import React, { useState } from "react";
import axios from "axios";
import {
  Container,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Box,
  AppBar,
  Toolbar
} from "@mui/material";

const API = "http://localhost:3001";

export default function Manager({ masterPassword }) {
  const [domain, setDomain] = useState("");
  const [password, setPassword] = useState("");
  const [result, setResult] = useState("");

  const setPwd = async () => {
    await axios.post(`${API}/set`, { domain, password });
    setResult("Password saved successfully.");
  };

  const getPwd = async () => {
    const r = await axios.post(`${API}/get`, { domain });
    setResult("Password: " + (r.data.password || "(not found)"));
  };

  const removePwd = async () => {
    const r = await axios.post(`${API}/remove`, { domain });
    setResult(r.data.removed ? "Password removed." : "Domain not found.");
  };

  return (
    <>
      <AppBar
        position="static"
        color="primary"
        sx={{
          mb: 4,
          boxShadow: 3
        }}
      >
        <Toolbar>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Password Manager
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm">
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
              variant="h5"
              sx={{
                fontWeight: 700,
                color: "primary.main",
                mb: 3,
              }}
            >
              Manage Stored Passwords
            </Typography>

            <Box>
              <TextField
                fullWidth
                label="Domain"
                value={domain}
                onChange={e => setDomain(e.target.value)}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                sx={{ mb: 3 }}
              />
            </Box>

            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <Button variant="contained" color="primary" onClick={setPwd}>
                Save
              </Button>
              <Button variant="outlined" color="primary" onClick={getPwd}
                sx={{
                  borderWidth: 2,
                  "&:hover": { borderWidth: 2 }
                }}
              >
                Get
              </Button>
              <Button variant="outlined" color="secondary" onClick={removePwd}
                sx={{
                  borderWidth: 2,
                  "&:hover": { borderWidth: 2 }
                }}
              >
                Remove
              </Button>
            </Box>

            {result && (
              <Typography
                sx={{
                  mt: 2,
                  color: "secondary.main",
                  fontWeight: 600
                }}
              >
                {result}
              </Typography>
            )}
          </CardContent>
        </Card>
      </Container>
    </>
  );
}
