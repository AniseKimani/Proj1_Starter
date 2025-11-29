// src/pages/Register.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import "../styles/auth.css";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleRegister(e) {
    e.preventDefault();
    setMessage("");

    try {
      const res = await fetch("http://localhost:4000/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Registration failed.");
        return;
      }

      setMessage("Account created! Redirecting...");
      setTimeout(() => {
        window.location.href = "/login";
      }, 1200);
    } catch (err) {
      setMessage("Network error. Backend might be down.");
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

      {/* LEFT - Register card */}
      <div className="auth-card">
        <h2 className="auth-title">Create Account</h2>
        <p className="auth-subtext">Join our password manager</p>

        <form onSubmit={handleRegister}>
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

          <button type="submit">Register</button>
        </form>

        {message && (
          <p style={{ marginTop: "10px", textAlign: "center", color: "red" }}>
            {message}
          </p>
        )}

        <p className="auth-switch">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>

      {/* RIGHT - Welcome text */}
      <div className="auth-welcome">
        <h1>The <span>Vault</span></h1>
        <p>Your passwords deserve luxury security. Access encrypted storage with maximum privacy and comfort.</p>
        <div className="welcome-btn">Get Started</div>
      </div>
    </div>
  );
}
