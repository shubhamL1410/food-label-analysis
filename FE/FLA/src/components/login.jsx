import { useState } from "react";

function Login({ onLoginSuccess }) {
  const [credentials, setCredentials] = useState({
    usernameOrEmail: "",
    password: ""
  });
  
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear errors when user starts typing
    if (error) setError("");
    if (message) setMessage("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Validation
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
      console.log("=== LOGIN ATTEMPT ===");
      console.log("Credentials:", { 
        usernameOrEmail: credentials.usernameOrEmail, 
        password: "***" 
      });

      // Prepare JSON request body (backend expects JSON, not FormData)
      const requestBody = {
        usernameOrEmail: credentials.usernameOrEmail,
        password: credentials.password
      };

      console.log("Request body:", requestBody);

      // Make API call
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody)
      });

      console.log("Response status:", response.status);
      console.log("Response headers:", Object.fromEntries(response.headers.entries()));

      const data = await response.json();
      console.log("Response data:", data);

      if (!response.ok) {
        // Handle HTTP errors
        const errorMessage = data.message || `Login failed (${response.status})`;
        console.error("Login failed:", errorMessage);
        setError(errorMessage);
        return;
      }

      // Check if we have a token (JWT authentication)
      if (data.token) {
        // Store JWT token
        localStorage.setItem("jwtToken", data.token);
        localStorage.setItem("token", "logged_in"); // Backward compatibility
        
        console.log("JWT token stored successfully");
        console.log("Token preview:", data.token.substring(0, 20) + "...");
        
        setMessage(data.message || "Login successful!");
        
        // Call success callback
        if (typeof onLoginSuccess === "function") {
          console.log("Calling onLoginSuccess callback");
          onLoginSuccess();
        }
      } else {
        // No token returned - authentication failed
        const errorMessage = data.message || "Login failed - no token received";
        console.error("No token received:", errorMessage);
        setError(errorMessage);
      }

    } catch (networkError) {
      console.error("Network error:", networkError);
      
      let errorMessage;
      if (networkError.message.includes("Failed to fetch")) {
        errorMessage = "Cannot connect to server. Please ensure the backend is running on http://localhost:8080";
      } else if (networkError.message.includes("JSON")) {
        errorMessage = "Invalid server response. Please check the backend.";
      } else {
        errorMessage = networkError.message || "An unexpected error occurred";
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      console.log("=== LOGIN ATTEMPT COMPLETED ===");
    }
  };

  return (
    <div className="auth-container">
      <h3>🔐 Login to Your Account</h3>
      
      <form onSubmit={handleLogin}>
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
          <label className="form-label" htmlFor="password">
            Password
          </label>
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

        <button 
          type="submit" 
          className="submit-button" 
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <div className="loading-spinner"></div>
              Signing in...
            </>
          ) : "Sign In"}
        </button>
      </form>

      {/* Error Message */}
      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Success Message */}
      {message && (
        <div className="success-message">
          <strong>Success:</strong> {message}
        </div>
      )}
    </div>
  );
}

export default Login;