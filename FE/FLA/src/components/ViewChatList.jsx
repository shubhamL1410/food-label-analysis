import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import ProfileModal from "./ProfileModal";

function ViewChatList({ isLoggedIn, navigateToLogin }) {
  const [chatList, setChatList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("jwtToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/chat/", { headers: getAuthHeaders() });
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            localStorage.removeItem("jwtToken");
            localStorage.removeItem("token");
            navigateToLogin?.();
            return;
          }
          setError("Failed to load chats");
          return;
        }
        const data = await res.json();
        if (!cancelled) setChatList(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setError("Failed to load chats");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isLoggedIn, navigateToLogin]);

  if (!isLoggedIn) {
    return (
      <div className="page-chats">
        <div className="chats-card chats-guest">
          <h2>My Chat History</h2>
          <p>Please log in to view and manage your chat history.</p>
          <button type="button" className="btn-primary" onClick={navigateToLogin}>
            Log In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-chats">
      <div className="chats-header">
        <h1>My Chat History</h1>
        <p>View your saved label analyses. Each chat includes prediction, optional Gemini analysis, and suggestions.</p>
        <div className="chats-header-actions">
          <Link to="/analyze" className="link-new">
            + New Analysis
          </Link>
        </div>
      </div>

      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        getAuthHeaders={getAuthHeaders}
      />

      {loading && <div className="chats-loading">Loading your chats...</div>}
      {error && <div className="msg-error">{error}</div>}

      {!loading && !error && chatList.length === 0 && (
        <div className="chats-empty">
          <div className="chats-empty-icon">📋</div>
          <h3>No chats yet</h3>
          <p>Start by analyzing a food label.</p>
          <Link to="/analyze" className="btn-primary">
            Go to Analyze
          </Link>
        </div>
      )}

      {!loading && chatList.length > 0 && (
        <div className="chats-list">
          {chatList.map((chat) => (
            <Link
              key={chat.id}
              to={`/viewchat/${chat.id}`}
              className="chat-card"
            >
              <span className="chat-card-type">
                {chat.type === "ingredient" ? "Ingredients" : "Nutrition"}
              </span>
              <span className="chat-card-date">
                {chat.createdAt ? new Date(chat.createdAt).toLocaleString() : ""}
              </span>
              {Number.isFinite(chat.healthScore) && (
                <span className="chat-card-score">{chat.healthScore}/100</span>
              )}
              <span className="chat-card-arrow">→</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default ViewChatList;
