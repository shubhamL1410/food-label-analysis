import { useState } from "react";
import { Link } from "react-router-dom";

function Login({ onLoginSuccess }) {
  const [credentials, setCredentials] = useState({
    usernameOrEmail: "",
    password: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
    if (message) setMessage("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!credentials.usernameOrEmail.trim()) {
      setError("Username or Email is required");
      return;
    }

    if (!credentials.password) {
      setError("Password is required");
      return;
    }

    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usernameOrEmail: credentials.usernameOrEmail,
          password: credentials.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || `Login failed (${response.status})`);
        return;
      }

      if (data.token) {
        localStorage.setItem("jwtToken", data.token);
        localStorage.setItem("token", "logged_in");
        localStorage.setItem("role", data.role || "USER");
        setMessage(data.message || "Login successful!");
        if (typeof onLoginSuccess === "function") {
          onLoginSuccess(data);
        }
      } else {
        setError(data.message || "Login failed — no token received");
      }
    } catch (networkError) {
      let errMsg = "Cannot connect to server. Please ensure the backend is running.";
      if (networkError.message?.includes("JSON")) {
        errMsg = "Invalid server response. Please try again.";
      } else if (!networkError.message?.includes("Failed to fetch")) {
        errMsg = networkError.message || "An unexpected error occurred";
      }
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-sm">
        <div className="auth-header">
          <h1>Welcome Back</h1>
          <p>Sign in to access analysis, suggestions, and chat history</p>
        </div>

        <form onSubmit={handleLogin} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="usernameOrEmail">
              Username or Email
            </label>
            <input
              id="usernameOrEmail"
              type="text"
              name="usernameOrEmail"
              placeholder="Enter your username or email"
              value={credentials.usernameOrEmail}
              onChange={handleInputChange}
              className="form-input"
              required
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              name="password"
              placeholder="Enter your password"
              value={credentials.password}
              onChange={handleInputChange}
              className="form-input"
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="spinner" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {error && <div className="auth-message auth-error">{error}</div>}
        {message && !error && <div className="auth-message auth-success">{message}</div>}

        <p className="auth-footer">
          Don&apos;t have an account? <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
