import { useEffect, useState } from "react";
import { Routes, Route, Link, useNavigate } from "react-router-dom";
import "./App.css";
import Analyze from "./components/Analyze";
import Login from "./components/login";
import AdminLogin from "./components/AdminLogin";
import AdminDashboard from "./components/AdminDashboard";
import Register from "./components/Register";
import HomePage from "./components/HomePage";
import ViewChatList from "./components/ViewChatList";
import ViewChatSingle from "./components/ViewChatSingle";

function Nav({ isLoggedIn, isAdmin, onLogout }) {
  return (
    <header className="nav-header">
      <Link to="/" className="nav-logo">
        <h2>Food Label Analysis</h2>
      </Link>
      <nav className="nav-links">
        {!isAdmin && <Link to="/analyze" className="nav-link">Analyze</Link>}
        {!isAdmin && <Link to="/viewchat" className="nav-link">My Chats</Link>}
        {isAdmin && <Link to="/admin/dashboard" className="nav-link nav-cta">Admin Panel</Link>}
        {!isLoggedIn && <Link to="/login" className="nav-link">Login</Link>}
        {!isLoggedIn && <Link to="/admin/login" className="nav-link">Admin Login</Link>}
        {isLoggedIn && (
          <button type="button" className="nav-link nav-logout" onClick={onLogout}>
            Logout
          </button>
        )}
      </nav>
    </header>
  );
}

function App() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });
  const [isLoggedIn, setIsLoggedIn] = useState(() =>
    Boolean(localStorage.getItem("token") || localStorage.getItem("jwtToken"))
  );
  const [role, setRole] = useState(() => localStorage.getItem("role") || "USER");
  const isAdmin = role === "ADMIN";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("jwtToken");
    localStorage.removeItem("role");
    setIsLoggedIn(false);
    setRole("USER");
    navigate("/login");
  };

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <div className="app-container">
      <Nav isLoggedIn={isLoggedIn} isAdmin={isAdmin} onLogout={handleLogout} />
      <button
        type="button"
        className="theme-fab"
        onClick={handleToggleTheme}
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        <span className={`theme-fab-icon sun ${theme === "light" ? "active" : ""}`}>☀</span>
        <span className={`theme-fab-icon moon ${theme === "dark" ? "active" : ""}`}>🌙</span>
      </button>
      <main>
        <Routes>
          <Route
            path="/"
            element={<HomePage isLoggedIn={isLoggedIn} onStart={() => navigate("/analyze")} />}
          />
          <Route
            path="/analyze"
            element={<Analyze isLoggedIn={isLoggedIn && !isAdmin} navigateToLogin={() => navigate("/login")} />}
          />
          <Route
            path="/login"
            element={
              <Login
                onLoginSuccess={(data) => {
                  localStorage.setItem("token", "logged_in");
                  localStorage.setItem("role", data?.role || "USER");
                  setIsLoggedIn(true);
                  setRole(data?.role || "USER");
                  navigate(data?.role === "ADMIN" ? "/admin/dashboard" : "/analyze");
                }}
              />
            }
          />
          <Route
            path="/admin/login"
            element={
              <AdminLogin
                onLoginSuccess={() => {
                  setIsLoggedIn(true);
                  setRole("ADMIN");
                  navigate("/admin/dashboard");
                }}
              />
            }
          />
          <Route
            path="/admin/dashboard"
            element={<AdminDashboard isAdmin={isAdmin && isLoggedIn} navigateToAdminLogin={() => navigate("/admin/login")} />}
          />
          <Route path="/register" element={<Register />} />
          <Route path="/viewchat" element={<ViewChatList isLoggedIn={isLoggedIn && !isAdmin} navigateToLogin={() => navigate("/login")} />} />
          <Route path="/viewchat/:id" element={<ViewChatSingle isLoggedIn={isLoggedIn && !isAdmin} navigateToLogin={() => navigate("/login")} />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
