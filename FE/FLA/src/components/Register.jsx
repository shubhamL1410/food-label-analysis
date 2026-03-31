import { useState } from "react";
import { Link } from "react-router-dom";

function Register({ onRegisterSuccess }) {
  const [username, setUsername] = useState("");
  const [gmail, setGmail] = useState("");
  const [password, setPassword] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [otp, setOtp] = useState("");

  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOtp = async () => {
    setError("");
    setMessage("");

    if (!gmail.trim()) {
      setError("Enter email first");
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch(`/auth/send-otp?email=${encodeURIComponent(gmail)}`, {
        method: "POST",
      });

      const text = await res.text();

      if (!res.ok) {
        setError(text || "Failed to send OTP");
        return;
      }

      setOtpSent(true);
      setOtpVerified(false);
      setOtp("");
      setMessage("OTP sent to your email. Check your inbox.");
    } catch (err) {
      setError("Failed to send OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError("");
    setMessage("");

    if (!gmail.trim()) {
      setError("Enter email first");
      return;
    }

    if (!otp.trim()) {
      setError("Enter the OTP first");
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch("/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gmail,
          otp,
        }),
      });

      const text = await response.text();

      if (!response.ok) {
        setError(text || "OTP verification failed");
        return;
      }

      setOtpVerified(true);
      setMessage("Email verified successfully. Now complete your profile.");
    } catch (err) {
      setError("Failed to verify OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!otpVerified) {
      setError("Please verify your email first");
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          gmail,
          password,
          height: Number(height) || null,
          weight: Number(weight) || null,
          birthDate,
        }),
      });

      const text = await response.text();

      if (!response.ok) {
        setError(text || "Registration failed");
        return;
      }

      setMessage("Account created! Logging you in...");

      // Auto-login after successful registration
      const loginRes = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usernameOrEmail: gmail,
          password,
        }),
      });

      const loginData = await loginRes.json();

      if (loginRes.ok && loginData.token) {
        localStorage.setItem("jwtToken", loginData.token);
        localStorage.setItem("token", "logged_in");
        if (typeof onRegisterSuccess === "function") {
          onRegisterSuccess();
        }
      } else {
        setMessage("Registration successful! Please log in.");
      }
    } catch (err) {
      setError("Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Create Account</h1>
          <p>Join Food Label Analysis and unlock full features</p>
        </div>

        <form onSubmit={handleRegister} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="gmail">Email</label>
            <div className="form-row">
              <input
                id="gmail"
                type="email"
                value={gmail}
                onChange={(e) => {
                  const nextEmail = e.target.value;
                  setGmail(nextEmail);
                  setOtpSent(false);
                  setOtpVerified(false);
                  setOtp("");
                }}
                placeholder="you@example.com"
                className="form-input"
                required
                disabled={otpVerified}
              />
              <button
                type="button"
                className="btn-otp"
                onClick={handleSendOtp}
                disabled={isLoading || !gmail.trim() || otpVerified}
              >
                {isLoading && !otpSent ? "Sending..." : otpSent ? "Resend OTP" : "Send OTP"}
              </button>
            </div>
          </div>

          {(otpSent || otpVerified) && (
            <div className="form-group">
              <label className="form-label" htmlFor="otp">Verification Code</label>
              <div className="form-row">
                <input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                  className="form-input"
                  required
                  disabled={otpVerified}
                />
                <button
                  type="button"
                  className="btn-otp"
                  onClick={handleVerifyOtp}
                  disabled={isLoading || otpVerified || !otp.trim()}
                >
                  {isLoading && otpSent && !otpVerified ? "Verifying..." : otpVerified ? "Verified" : "Verify OTP"}
                </button>
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
              className="form-input"
              required
              disabled={!otpVerified}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a strong password"
              className="form-input"
              required
              disabled={!otpVerified}
            />
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label" htmlFor="height">Height (cm)</label>
              <input
                id="height"
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="170"
                className="form-input"
                min="50"
                max="250"
                disabled={!otpVerified}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="weight">Weight (kg)</label>
              <input
                id="weight"
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="70"
                className="form-input"
                min="20"
                max="300"
                disabled={!otpVerified}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="birthDate">Birth Date</label>
            <input
              id="birthDate"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="form-input"
              required
              disabled={!otpVerified}
            />
          </div>

          <button type="submit" className="submit-btn" disabled={isLoading || !otpVerified}>
            {isLoading ? (
              <>
                <span className="spinner" />
                Processing...
              </>
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        {error && <div className="auth-message auth-error">{error}</div>}
        {message && !error && <div className="auth-message auth-success">{message}</div>}

        <p className="auth-footer">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
