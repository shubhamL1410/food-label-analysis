import { useState } from "react";
import "./App.css";
import Analyze from "./components/Analyze";
import Login from "./components/login";
import Register from "./components/Register";
import HomePage from "./components/HomePage";

function App() {
  const [page, setPage] = useState("home");
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return Boolean(localStorage.getItem("token") || localStorage.getItem("jwtToken"));
  });

  const renderPage = () => {
    if (page === "home")
      return (
        <HomePage
          isLoggedIn={isLoggedIn}
          onStart={() => setPage("analyze")}
        />
      );
    if (page === "login")
      return (
        <Login
          onLoginSuccess={() => {
            localStorage.setItem("token", "logged_in");
            setIsLoggedIn(true);
            setPage("analyze");
          }}
        />
      );
    if (page === "register") return <Register />;
    return (
      <Analyze
        isLoggedIn={isLoggedIn}
        navigateToLogin={() => setPage("login")}
      />
    );
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("jwtToken"); // Clear JWT token
    setIsLoggedIn(false);
    setPage("login");
  };

  return (
    <div className="app-container">
      <header className="nav-header">
        <h2>🍎 Food Label Analysis</h2>
        <nav className="nav-buttons">
          <button className="nav-button" onClick={() => setPage("home")}>
            Home
          </button>
          <button className="nav-button" onClick={() => setPage("analyze")}>
            Analyze
          </button>
          <button className="nav-button" onClick={() => setPage("login")}>
            Login
          </button>
          <button className="nav-button" onClick={() => setPage("register")}>
            Register
          </button>
          <button className="nav-button" onClick={handleLogout} disabled={!isLoggedIn}>
            Logout
          </button>
        </nav>
      </header>

      <main>
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
  