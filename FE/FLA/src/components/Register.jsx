import { useState } from "react";

function Register() {
  const [username, setUsername] = useState("");
  const [gmail, setGmail] = useState("");
  const [password, setPassword] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [birthDate, setBirthDate] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!username.trim()) {
      setError("Username is required");
      return;
    }

    if (!gmail.trim()) {
      setError("Email is required");
      return;
    }

    if (!password) {
      setError("Password is required");
      return;
    }

    if (!height || Number.isNaN(Number(height))) {
      setError("Height is required");
      return;
    }

    if (!weight || Number.isNaN(Number(weight))) {
      setError("Weight is required");
      return;
    }

    if (!birthDate) {
      setError("Birth date is required");
      return;
    }

    try {
      setIsLoading(true);

      // Backend: @PostMapping("/auth/register") with @RequestBody User
      const response = await fetch("/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          gmail,
          password,
          height: Number(height),
          weight: Number(weight),
          birthDate,
        }),
      });

      const text = await response.text();

      if (!response.ok) {
        setError(text || `Register failed (${response.status})`);
        return;
      }

      if (text.toLowerCase().includes("success")) {
        setMessage(text);
      } else {
        setError(text);
      }
    } catch (err) {
      setError(err?.message || "Failed to reach server");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h3>📝 Create Account</h3>

      <form onSubmit={handleRegister}>
        <div className="form-group">
          <label className="form-label">Username</label>
          <input
            type="text"
            placeholder="Choose a username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="form-input"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Email</label>
          <input
            type="email"
            placeholder="Enter your email"
            value={gmail}
            onChange={(e) => setGmail(e.target.value)}
            className="form-input"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            type="password"
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="form-input"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Height (cm)</label>
          <input
            type="number"
            placeholder="Enter your height"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            className="form-input"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Weight (kg)</label>
          <input
            type="number"
            placeholder="Enter your weight"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="form-input"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Birth Date</label>
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="form-input"
            required
          />
        </div>

        <button type="submit" className="submit-button" disabled={isLoading}>
          {isLoading ? (
            <>
              <div className="loading-spinner"></div>
              Registering...
            </>
          ) : "Register"}
        </button>
      </form>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {message && (
        <div className="success-message">
          {message}
        </div>
      )}
    </div>
  );
}

export default Register;
