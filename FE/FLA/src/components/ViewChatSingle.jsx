import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import TrafficLight, { getPredictionStatus } from "./TrafficLight/TrafficLight";
import HealthScoreRing from "./HealthScoreRing";

function getImageSrc(imageUrl) {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("http") || imageUrl.startsWith("data:")) return imageUrl;
  if (imageUrl.startsWith("/")) return window.location.origin + imageUrl;
  return window.location.origin + "/" + imageUrl;
}

function ViewChatSingle({ isLoggedIn, navigateToLogin }) {
  const { id } = useParams();
  const [chat, setChat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [previewImage, setPreviewImage] = useState(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("jwtToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    if (!isLoggedIn || !id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/chat/${id}`, { headers: getAuthHeaders() });
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            localStorage.removeItem("jwtToken");
            localStorage.removeItem("token");
            navigateToLogin?.();
            return;
          }
          if (res.status === 404) setError("Chat not found");
          else setError("Failed to load chat");
          return;
        }
        const data = await res.json();
        if (!cancelled) setChat(data);
      } catch {
        if (!cancelled) setError("Failed to load chat");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, isLoggedIn, navigateToLogin]);

  if (!isLoggedIn) {
    return (
      <div className="page-chats">
        <div className="chats-card chats-guest">
          <p>Please log in to view this chat.</p>
          <button type="button" className="btn-primary" onClick={navigateToLogin}>
            Log In
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-chats">
        <div className="chats-loading">Loading chat...</div>
      </div>
    );
  }

  if (error || !chat) {
    return (
      <div className="page-chats">
        <div className="chats-card chats-guest">
          <p className="msg-error">{error || "Chat not found"}</p>
          <Link to="/viewchat" className="btn-primary">
            ← Back to Chat List
          </Link>
        </div>
      </div>
    );
  }

  const imageSrc = getImageSrc(chat.image);

  return (
    <div className="page-chat-single">
      <div className="chat-single-header">
        <Link to="/viewchat" className="link-back">← Back to Chat List</Link>
        <h1>
          {chat.type === "ingredient" ? "Ingredients" : "Nutrition"} ·{" "}
          {chat.createdAt ? new Date(chat.createdAt).toLocaleString() : ""}
        </h1>
      </div>

      <div className="chat-single-content">
        {imageSrc && (
          <div className="chat-single-image-wrap">
            <img
              src={imageSrc}
              alt="Food label"
              className="chat-single-image chat-single-image-clickable"
              onClick={() => setPreviewImage(imageSrc)}
              onError={(e) => {
                e.target.style.display = "none";
                e.target.nextSibling?.classList?.remove("hidden");
              }}
            />
            <p className="chat-single-image-fallback hidden">Image could not be loaded</p>
          </div>
        )}

        {previewImage && (
          <div
            className="image-preview-overlay"
            onClick={() => setPreviewImage(null)}
          >
            <img
              src={previewImage}
              alt="Preview"
              className="image-preview-img"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              type="button"
              className="image-preview-close"
              onClick={() => setPreviewImage(null)}
              aria-label="Close preview"
            >
              ×
            </button>
          </div>
        )}

        {chat.modelPrediction && (
          <section className="chat-single-section">
            <h3>Model prediction</h3>
            {Number.isFinite(chat.healthScore) && (
              <div className="chat-single-score">
                <HealthScoreRing score={chat.healthScore} size={112} />
              </div>
            )}
            {getPredictionStatus(chat.modelPrediction) && (
              <TrafficLight status={getPredictionStatus(chat.modelPrediction)} />
            )}
            <div className="chat-single-text">{chat.modelPrediction}</div>
          </section>
        )}

        {chat.analyzeData && (
          <section className="chat-single-section">
            <h3>Gemini analysis</h3>
            <div className="chat-single-text">{chat.analyzeData}</div>
          </section>
        )}

        {chat.suggestData && (
          <section className="chat-single-section">
            <h3>Suggestions</h3>
            <div className="chat-single-text">{chat.suggestData}</div>
          </section>
        )}

        {!chat.modelPrediction && !chat.analyzeData && !chat.suggestData && (
          <p className="chat-single-empty">No prediction or analysis data for this chat.</p>
        )}
      </div>
    </div>
  );
}

export default ViewChatSingle;
