import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../services/api";

function AdminDashboard({ isAdmin, navigateToAdminLogin }) {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [chats, setChats] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("jwtToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [statsRes, usersRes, chatsRes] = await Promise.all([
        apiFetch("/api/admin/stats", { headers: getAuthHeaders() }),
        apiFetch("/api/admin/users", { headers: getAuthHeaders() }),
        apiFetch("/api/admin/chats", { headers: getAuthHeaders() }),
      ]);

      if ([statsRes, usersRes, chatsRes].some((r) => r.status === 401 || r.status === 403)) {
        localStorage.removeItem("jwtToken");
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        navigateToAdminLogin?.();
        return;
      }

      if (!statsRes.ok || !usersRes.ok || !chatsRes.ok) {
        setError("Failed to load admin dashboard data");
        return;
      }

      const [statsData, usersData, chatsData] = await Promise.all([
        statsRes.json(),
        usersRes.json(),
        chatsRes.json(),
      ]);
      setStats(statsData);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setChats(Array.isArray(chatsData) ? chatsData : []);
    } catch (err) {
      setError(err?.message || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    loadData();
  }, [isAdmin]);

  const chatByUser = useMemo(() => {
    const map = new Map();
    chats.forEach((chat) => {
      map.set(chat.userId, (map.get(chat.userId) || 0) + 1);
    });
    return map;
  }, [chats]);

  const handleDeleteUser = async (id) => {
    if (!window.confirm("Delete this user and all related records?")) return;
    try {
      const res = await apiFetch(`/api/admin/users/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const txt = await res.text();
        setError(txt || "Failed to delete user");
        return;
      }
      await loadData();
    } catch (err) {
      setError(err?.message || "Delete failed");
    }
  };

  const handleDeleteChat = async (id) => {
    if (!window.confirm("Delete this chat record?")) return;
    try {
      const res = await apiFetch(`/api/admin/chats/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        setError("Failed to delete chat");
        return;
      }
      setChats((prev) => prev.filter((x) => x.id !== id));
    } catch (err) {
      setError(err?.message || "Delete failed");
    }
  };

  if (!isAdmin) {
    return (
      <div className="page-chats">
        <div className="chats-card chats-guest">
          <h2>Admin Panel</h2>
          <p>Please sign in as admin to access dashboard.</p>
          <button type="button" className="btn-primary" onClick={navigateToAdminLogin}>
            Admin Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <button type="button" className="btn-secondary" onClick={loadData}>Refresh</button>
      </div>

      {error && <div className="msg-error">{error}</div>}
      {loading && <div className="chats-loading">Loading dashboard...</div>}

      {!loading && stats && (
        <>
          <section className="admin-stats">
            <div className="admin-stat-card">
              <h3>Total Users</h3>
              <p>{stats.totalUsers}</p>
            </div>
            <div className="admin-stat-card">
              <h3>Stored Chats</h3>
              <p>{stats.totalStoredChats}</p>
            </div>
          </section>

          <section className="admin-section">
            <h2>Users</h2>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Verified</th>
                    <th>Chats</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.username}</td>
                      <td>{u.gmail}</td>
                      <td>{u.role}</td>
                      <td>{u.verified ? "Yes" : "No"}</td>
                      <td>{chatByUser.get(u.username) || 0}</td>
                      <td>
                        {u.role === "ADMIN" ? (
                          <span className="admin-badge">Protected</span>
                        ) : (
                          <button
                            type="button"
                            className="btn-danger"
                            onClick={() => handleDeleteUser(u.id)}
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="admin-section">
            <h2>Food Analysis Records</h2>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Type</th>
                    <th>Score</th>
                    <th>Gemini Called</th>
                    <th>Created</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {chats.map((c) => (
                    <tr key={c.id}>
                      <td>{c.userId}</td>
                      <td>{c.type}</td>
                      <td>{Number.isFinite(c.healthScore) ? c.healthScore : "-"}</td>
                      <td>{(c.geminiCalled ?? (Boolean(c.analyzeData) || Boolean(c.suggestData))) ? "true" : "false"}</td>
                      <td>{c.createdAt ? new Date(c.createdAt).toLocaleString() : "-"}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-danger"
                          onClick={() => handleDeleteChat(c.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

        </>
      )}
    </div>
  );
}

export default AdminDashboard;
