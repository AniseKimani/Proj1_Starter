// src/pages/Login.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Login failed.");
        return;
      }

      if (data.userId) {
        localStorage.setItem("userId", data.userId);
      }

      setMessage("Login successful! Redirecting...");
      setTimeout(() => navigate("/dashboard"), 400);
    } catch (err) {
      setMessage("Network error. Is the backend running?");
    }
  }

  return (
    <div className="auth-wrapper">

      {/* Faux Navbar */}
      <div className="auth-navbar">
        <div className="nav-logo">🔐 Vault</div>
        <div className="nav-menu">
          <p>Home</p>
          <p>About</p>
          <p>Contact</p>
          <p>Help</p>
        </div>
      </div>

      {/* LEFT - Login card */}
      <div className="auth-card">
        <h2 className="auth-title">Welcome Back</h2>
        <p className="auth-subtext">Login to continue</p>

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit">Login</button>
        </form>

        {message && (
          <p style={{ marginTop: "10px", textAlign: "center", color: "red" }}>
            {message}
          </p>
        )}

        <p className="auth-switch">
          New user? <Link to="/register">Register</Link>
        </p>
      </div>

      {/* RIGHT - Welcome text */}
      <div className="auth-welcome">
        <h1>The <span>Vault</span></h1>
        <p>Store, encrypt, and protect your most important passwords with elegance, privacy, and unmatched security.</p>
        <div className="welcome-btn">Get Started</div>
      </div>
    </div>
  );
}
