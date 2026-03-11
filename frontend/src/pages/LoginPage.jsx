import { useState } from "react";
import { API } from "../constants";
import styles from "../styles";

export default function LoginPage({ onLogin }) {
  const [form, setForm]       = useState({ username: "", password: "" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Invalid credentials");
      const data = await res.json();
      localStorage.setItem("token",    data.access_token);
      localStorage.setItem("role",     data.role);
      localStorage.setItem("username", data.username);
      onLogin(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.loginWrap}>
      <div style={styles.loginCard}>
        <div style={styles.loginLogo}>💧</div>
        <h1 style={styles.loginTitle}>Barangay Water System</h1>
        <p style={styles.loginSub}>Monitoring & Control Dashboard</p>

        <form onSubmit={handleSubmit} style={styles.loginForm}>
          <input
            style={styles.input}
            placeholder="Username"
            value={form.username}
            onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
            autoFocus
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
          />
          {error && <div style={styles.errorMsg}>{error}</div>}
          <button style={styles.loginBtn} disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p style={styles.loginHint}>Default: admin / admin123</p>
      </div>
    </div>
  );
}
