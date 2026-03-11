import { useState } from "react";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";

export default function App() {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem("token");
    if (!token) return null;
    return {
      username: localStorage.getItem("username"),
      role:     localStorage.getItem("role"),
    };
  });

  function handleLogout() {
    localStorage.clear();
    setUser(null);
  }

  if (!user) return <LoginPage onLogin={u => setUser(u)} />;
  return <Dashboard user={user} onLogout={handleLogout} />;
}
