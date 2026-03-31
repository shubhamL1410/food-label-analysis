import { useState, useEffect } from "react";

function ProfileModal({ isOpen, onClose, getAuthHeaders }) {
  const [username, setUsername] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (isOpen) {
      setError("");
      setMessage("");
      fetchProfile();
    }
  }, [isOpen]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/profile", { headers: getAuthHeaders() });
      if (!res.ok) {
        setError("Failed to load profile");
        return;
      }
      const data = await res.json();
      setUsername(data.username || "");
      setHeight(data.height != null ? String(data.height) : "");
      setWeight(data.weight != null ? String(data.weight) : "");
      setBirthDate(data.birthDate || "");
    } catch {
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          username: username.trim() || undefined,
          height: height ? Number(height) : undefined,
          weight: weight ? Number(weight) : undefined,
          birthDate: birthDate || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        setError(err || "Failed to update profile");
        return;
      }
      setMessage("Profile updated successfully!");
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch {
      setError("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Update Profile</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          {loading ? (
            <p className="modal-loading">Loading profile...</p>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="form-input"
                  placeholder="Username"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Height (cm)</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="form-input"
                  placeholder="170"
                  min="50"
                  max="250"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Weight (kg)</label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="form-input"
                  placeholder="70"
                  min="20"
                  max="300"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Birth Date</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="form-input"
                />
              </div>
            </>
          )}
          {error && <div className="auth-error modal-error">{error}</div>}
          {message && <div className="auth-success modal-success">{message}</div>}
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading || saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProfileModal;
