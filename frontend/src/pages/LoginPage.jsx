// src/pages/LoginPage.jsx
import { useState } from "react";
import { API } from "../constants";
import styles from "../styles";

export default function LoginPage({ onLogin }) {
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
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
      
      // I-save ang mahahalagang data
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("username", data.username);
      localStorage.setItem("role", data.role);
      
      onLogin(data);
    } catch (err) { 
      setError("Login Failed. Check connection or credentials."); 
    } finally { 
      setLoading(false); 
    }
  }

  return (
    <div style={styles.loginWrap}>
      <div style={styles.loginCard}>
        {/* WATER DROP LOGO */}
        <div style={styles.loginLogo}>💧</div>
        
        <h1 style={styles.loginTitle}>Water Monitoring</h1>
        <p style={styles.loginSub}>PROJECT: WATER FILTER SYSTEM</p>

        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <div style={styles.formGroup}>
            <label style={styles.label}>USERNAME</label>
            <input 
              style={styles.input} 
              placeholder="Enter username" 
              required
              onChange={e => setForm({...form, username: e.target.value})} 
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>PASSWORD</label>
            <input 
              style={styles.input} 
              type="password" 
              placeholder="••••••••" 
              required
              onChange={e => setForm({...form, password: e.target.value})} 
            />
          </div>

          <button style={styles.loginBtn} disabled={loading} type="submit">
            {loading ? "VERIFYING..." : "SIGN IN"}
          </button>
          
          {error && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '15px' }}>{error}</p>}
        </form>

      </div>
    </div>
  );
}