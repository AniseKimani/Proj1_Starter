// src/pages/Login.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/auth.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setMessage("");

    try {
      const res = await fetch("http://localhost:4000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Login failed.");
        return;
      }

      // Save userId to localStorage so Dashboard can use it
      if (data.userId) {
        localStorage.setItem("userId", data.userId);
      }
      // If you later expand to token-based auth, save token here as well:
      // if (data.token) localStorage.setItem("token", data.token);

      setMessage("Login successful! Redirecting...");
      // use navigate from react-router
      setTimeout(() => navigate("/dashboard"), 400);
    } catch (err) {
      console.error("Login network error:", err);
      setMessage("Network error. Is the backend running?");
    }
  }

  return (
    <div className="center-page">
      <div className="card">
        <h2 className="auth-title">Welcome Back</h2>
        <p className="auth-subtext">Login to continue</p>

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />

          <button type="submit">Login</button>
        </form>

        {message && (
          <p style={{ marginTop: "10px", textAlign: "center", color: "red" }}>
            {message}
          </p>
        )}

        <p style={{ marginTop: "15px", textAlign: "center" }}>
          New user? <a href="/">Register</a>
        </p>
      </div>
    </div>
  );
}
