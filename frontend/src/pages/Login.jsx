import { useState } from "react";
import "../styles/auth.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

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

      setMessage("Login successful! Redirecting...");
      setTimeout(() => {
        window.location.href = "/dashboard"; // Change if needed
      }, 1200);

    } catch (err) {
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
