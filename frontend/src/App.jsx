import { useState, useEffect } from "react";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setUser({
        token,
        role: localStorage.getItem("role"),
        username: localStorage.getItem("username")
      });
    }
    setLoading(false);
  }, []);

  if (loading) return null;

  return user ? (
    <Dashboard user={user} onLogout={() => { localStorage.clear(); setUser(null); }} />
  ) : (
    <LoginPage onLogin={(data) => setUser(data)} />
  );
}