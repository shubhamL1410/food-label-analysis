import { useState } from "react";
import { Link } from "react-router-dom";

function AdminLogin({ onLoginSuccess }) {
  const [credentials, setCredentials] = useState({
    usernameOrEmail: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Login failed");
        return;
      }

      if (!data.token || data.role !== "ADMIN") {
        setError("Only admin account can access this panel");
        return;
      }

      localStorage.setItem("jwtToken", data.token);
      localStorage.setItem("token", "logged_in");
      localStorage.setItem("role", "ADMIN");

      onLoginSuccess?.(data);
    } catch (err) {
      setError(err?.message || "Unable to connect server");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-sm">
        <div className="auth-header">
          <h1>Admin Sign In</h1>
          <p>Access dashboard, users and moderation controls</p>
        </div>

        <form onSubmit={handleLogin} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="admin-username">
              Admin Username or Email
            </label>
            <input
              id="admin-username"
              type="text"
              name="usernameOrEmail"
              value={credentials.usernameOrEmail}
              onChange={handleInputChange}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type="password"
              name="password"
              value={credentials.password}
              onChange={handleInputChange}
              className="form-input"
              required
            />
          </div>

          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign In as Admin"}
          </button>
        </form>

        {error && <div className="auth-message auth-error">{error}</div>}

        <p className="auth-footer">
          User account? <Link to="/login">Go to User Login</Link>
        </p>
      </div>
    </div>
  );
}

export default AdminLogin;
