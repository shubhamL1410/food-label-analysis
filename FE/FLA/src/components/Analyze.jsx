import { useState, useRef, useEffect } from "react";

function Analyze({ isLoggedIn, navigateToLogin }) {
  const [image, setImage] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [labelType, setLabelType] = useState(isLoggedIn ? "" : "nutrition");
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState("");
  const [suggestionError, setSuggestionError] = useState("");
  const [isSuggestionLoading, setIsSuggestionLoading] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [lastExtractedText, setLastExtractedText] = useState("");
  const [lastLabelType, setLastLabelType] = useState("nutrition");
  const [isAnalyzeTextLoading, setIsAnalyzeTextLoading] = useState(false);
  const [geminiAnalysis, setGeminiAnalysis] = useState("");
  const [chatList, setChatList] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [expandedChatId, setExpandedChatId] = useState(null);
  const [isSavingChat, setIsSavingChat] = useState(false);
  const messagesEndRef = useRef(null);

  const handleNavigateToLogin = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("jwtToken");
    if (navigateToLogin) {
      navigateToLogin();
    }
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem("jwtToken");
    if (token) {
      return {
        'Authorization': `Bearer ${token}`
      };
    }
    return {};
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  function normalizeLabelType(value) {
    if (!value || !value.trim()) return "nutrition";
    const v = value.trim().toLowerCase();
    if (v.includes("ingredient")) return "ingredient";
    return "nutrition";
  }

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!isLoggedIn) setLabelType("nutrition");
  }, [isLoggedIn]);

  const fetchChats = async () => {
    if (!isLoggedIn) return;
    setChatLoading(true);
    try {
      const res = await fetch("/api/chat/", { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setChatList(Array.isArray(data) ? data : []);
      }
    } catch {
      setChatList([]);
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) fetchChats();
  }, [isLoggedIn]);

  const addMessage = (type, content, imageUrl = null) => {
    setMessages(prev => [...prev, { id: Date.now(), type, content, imageUrl }]);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setImageUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuggestion("");
    setSuggestionError("");
    setGeminiAnalysis("");

    if (!image) {
      setError("Please select an image first");
      return;
    }

    if (isLoggedIn && (!labelType || !labelType.trim())) {
      setError("Please select a label type");
      return;
    }

    const backendLabelType = isLoggedIn ? normalizeLabelType(labelType) : "nutrition";
    const userMessage = `Analyze this ${backendLabelType} label`;
    addMessage("user", userMessage, imageUrl);

    const formData = new FormData();
    formData.append("image", image);
    if (isLoggedIn) {
      formData.append("labelType", backendLabelType);
    }

    const url = isLoggedIn ? "/analyze" : "/api/public/analyze/nutrition";
    const headers = isLoggedIn ? getAuthHeaders() : {};

    try {
      setIsLoading(true);
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: formData,
      });

      if (!response.ok) {
        const text = await response.text();
        setError(text || `Request failed with status ${response.status}`);
        addMessage("assistant", `Error: ${text || `Request failed with status ${response.status}`}`);
        return;
      }

      const data = await response.json();
      const analysisMessage = `**Model Prediction:** ${data.explanation}`;
      addMessage("assistant", analysisMessage);
      setHasAnalyzed(true);
      const extracted = data.explanation ?? "";
      setLastExtractedText(extracted);
      setLastLabelType(backendLabelType);
    } catch (error) {
      const errorMessage = error?.message || "Failed to reach server";
      setError(errorMessage);
      addMessage("assistant", `Error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyzeWithGemini = async () => {
    if (!isLoggedIn) {
      setError("Please log in to analyze with Gemini.");
      return;
    }
    if (!lastExtractedText || !lastExtractedText.trim()) {
      setError("No extracted text available. Run an analysis first.");
      return;
    }

    addMessage("user", "Analyze this extracted label with Gemini");

    try {
      setIsAnalyzeTextLoading(true);
      const response = await fetch("/api/food/analyze-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          extractedText: lastExtractedText,
          labelType: lastLabelType,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        setError(text || `Request failed with status ${response.status}`);
        addMessage("assistant", `Error: ${text || `Request failed with status ${response.status}`}`);
        return;
      }

      const text = await response.text();
      setGeminiAnalysis(text);
      addMessage("assistant", `**AI analysis of extracted label:**\n\n${text}`);
    } catch (err) {
      const msg = err?.message || "Failed to reach server";
      setError(msg);
      addMessage("assistant", `Error: ${msg}`);
    } finally {
      setIsAnalyzeTextLoading(false);
    }
  };

  const handleGetSuggestion = async () => {
    setSuggestion("");
    setSuggestionError("");

    if (!isLoggedIn) {
      setSuggestionError("Please log in to get Gemini suggestions.");
      return;
    }
    if (!image) {
      setSuggestionError("Image file is required");
      return;
    }

    addMessage("user", "Can you provide suggestions based on this analysis?");

    try {
      setIsSuggestionLoading(true);
      const formData = new FormData();
      formData.append("image", image);

      const response = await fetch("/api/food/suggest", {
        method: "POST",
        headers: {
          ...getAuthHeaders()
        },
        body: formData,
      });

      if (!response.ok) {
        if (response.status === 403) {
          handleNavigateToLogin();
          return;
        }
        const text = await response.text();
        setSuggestionError(text || `Request failed with status ${response.status}`);
        addMessage("assistant", `Error getting suggestions: ${text || `Request failed with status ${response.status}`}`);
        return;
      }

      const text = await response.text();
      setSuggestion(text);
      addMessage("assistant", `**Suggestions:**\n\n${text}`);
    } catch (err) {
      const errorMessage = err?.message || "Failed to reach server";
      setSuggestionError(errorMessage);
      addMessage("assistant", `Error getting suggestions: ${errorMessage}`);
    } finally {
      setIsSuggestionLoading(false);
    }
  };

  const handleEndChat = async () => {
    if (!isLoggedIn) {
      setError("Please log in to save chat.");
      return;
    }
    if (!hasAnalyzed) {
      setError("Please analyze an image first.");
      return;
    }

    setIsSavingChat(true);
    try {
      const imageDataUrl = imageUrl;
      const chatRequest = {
        image: imageDataUrl,
        type: lastLabelType,
        analyzeData: geminiAnalysis || null,
        suggestData: suggestion || null,
      };

      const response = await fetch("/api/chat/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(chatRequest),
      });

      if (!response.ok) {
        const text = await response.text();
        setError(`Failed to save chat: ${text || response.status}`);
        return;
      }

      const saved = await response.json();
      addMessage("assistant", "✅ Chat saved successfully!");
      fetchChats();
      
      setTimeout(() => {
        handleResetChat();
      }, 1500);
    } catch (err) {
      setError(`Failed to save chat: ${err?.message || "Unknown error"}`);
    } finally {
      setIsSavingChat(false);
    }
  };

  const handleResetChat = () => {
    setImage(null);
    setImageUrl(null);
    setLabelType(isLoggedIn ? "" : "nutrition");
    setMessages([]);
    setError("");
    setSuggestion("");
    setSuggestionError("");
    setHasAnalyzed(false);
    setLastExtractedText("");
    setLastLabelType("nutrition");
    setGeminiAnalysis("");
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h3>🍎 Food Label Analysis Chat</h3>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="message assistant">
            <div className="message-content">
              {isLoggedIn
                ? "👋 Upload a nutrition or ingredients label image, choose the type, and I'll analyze it. You can optionally get Gemini analysis and suggestions."
                : "👋 You can analyze a nutrition label image here. Sign in to also analyze ingredients and get AI suggestions."}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className={`message ${message.type}`}>
            <div className="message-content">
              <div style={{ whiteSpace: 'pre-line' }}>
                {message.content}
              </div>
              {message.imageUrl && (
                <img
                  src={message.imageUrl}
                  alt="Uploaded label"
                  className="message-image"
                />
              )}
            </div>
          </div>
        ))}

        {(isLoading || isSuggestionLoading || isAnalyzeTextLoading || isSavingChat) && (
          <div className="message assistant">
            <div className="message-content">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="loading-spinner"></div>
                {(isLoading && "Analyzing your food label...") ||
                  (isSuggestionLoading && "Getting suggestions...") ||
                  (isAnalyzeTextLoading && "Analyzing extracted text with Gemini...") ||
                  (isSavingChat && "Saving chat...")}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        {error && (
          <div className="error-message" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {!hasAnalyzed ? (
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <div className="file-input-wrapper">
                <label htmlFor="file-upload" className="file-input-label">
                  📷 Choose Image
                </label>
                <input
                  id="file-upload"
                  type="file"
                  onChange={handleImageChange}
                  accept="image/*"
                  className="file-input"
                />
              </div>

              {isLoggedIn ? (
                <select
                  value={labelType}
                  onChange={(e) => setLabelType(e.target.value)}
                  className="text-input"
                  required
                >
                  <option value="">Select label type</option>
                  <option value="nutrition">Nutrition</option>
                  <option value="ingredient">Ingredients</option>
                </select>
              ) : (
                <span className="label-type-badge">Nutrition label only (sign in for ingredients)</span>
              )}

              <button
                type="submit"
                className="send-button"
                disabled={isLoading || isSuggestionLoading || isAnalyzeTextLoading}
              >
                {isLoading ? (
                  <>
                    <div className="loading-spinner"></div>
                    Analyzing...
                  </>
                ) : "Analyze"}
              </button>
            </div>
          </form>
        ) : (
          <div style={{ textAlign: 'center', padding: '1rem' }}>
            <p style={{ color: '#4a5568', marginBottom: '1rem' }}>
              ✅ Model prediction complete!
              {isLoggedIn ? " You can optionally get Gemini analysis and suggestions." : ""}
            </p>
          </div>
        )}

        {hasAnalyzed && isLoggedIn && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", justifyContent: "center", marginBottom: "1rem" }}>
            <button
              type="button"
              className="suggestion-button"
              onClick={handleAnalyzeWithGemini}
              disabled={isAnalyzeTextLoading || isSuggestionLoading || isLoading || !!geminiAnalysis}
            >
              {isAnalyzeTextLoading ? (
                <>
                  <div className="loading-spinner"></div>
                  Analyzing...
                </>
              ) : "📋 Analyze with Gemini"}
            </button>
            <button
              type="button"
              className="suggestion-button"
              onClick={handleGetSuggestion}
              disabled={isSuggestionLoading || isAnalyzeTextLoading || isLoading || !!suggestion}
            >
              {isSuggestionLoading ? (
                <>
                  <div className="loading-spinner"></div>
                  Getting suggestions...
                </>
              ) : "💡 Get Suggestions"}
            </button>
            <button
              type="button"
              className="suggestion-button"
              onClick={handleEndChat}
              disabled={isSavingChat || isLoading || isSuggestionLoading || isAnalyzeTextLoading}
              style={{ background: "var(--success)", border: "none" }}
            >
              {isSavingChat ? (
                <>
                  <div className="loading-spinner"></div>
                  Saving...
                </>
              ) : "✅ End Chat & Save"}
            </button>
          </div>
        )}

        {isLoggedIn && (
          <section className="history-section" style={{ marginTop: "2rem" }}>
            <h4 style={{ marginBottom: "0.75rem", color: "var(--dark)" }}>📋 Previous Chats</h4>
            {chatLoading ? (
              <p style={{ color: "var(--gray)" }}>Loading...</p>
            ) : chatList.length === 0 ? (
              <p style={{ color: "var(--gray)" }}>No previous chats yet.</p>
            ) : (
              <div className="history-list" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {chatList.map((chat) => (
                  <div
                    key={chat.id}
                    className="history-card"
                    style={{
                      border: "1px solid var(--light)",
                      borderRadius: "12px",
                      overflow: "hidden",
                      background: "var(--white)",
                      boxShadow: "var(--shadow)",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedChatId(expandedChatId === chat.id ? null : chat.id)}
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem",
                        textAlign: "left",
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontWeight: 600,
                        color: "var(--dark)",
                      }}
                    >
                      <span>
                        {chat.type === "ingredient" ? "Ingredients" : "Nutrition"} · {chat.createdAt ? new Date(chat.createdAt).toLocaleString() : ""}
                      </span>
                      <span style={{ fontSize: "1.25rem" }}>{expandedChatId === chat.id ? "−" : "+"}</span>
                    </button>
                    {expandedChatId === chat.id && (
                      <div style={{ padding: "1rem", borderTop: "1px solid var(--light)", whiteSpace: "pre-wrap", fontSize: "0.95rem" }}>
                        {chat.image && (
                          <div style={{ marginBottom: "0.75rem" }}>
                            <img
                              src={chat.image}
                              alt="Food label"
                              style={{ maxWidth: "100%", borderRadius: "8px", border: "1px solid var(--light)" }}
                            />
                          </div>
                        )}
                        {chat.analyzeData && (
                          <div style={{ marginBottom: "0.75rem" }}>
                            <strong>Gemini Analysis:</strong>
                            <div style={{ marginTop: "0.25rem" }}>{chat.analyzeData}</div>
                          </div>
                        )}
                        {chat.suggestData && (
                          <div>
                            <strong>Suggestions:</strong>
                            <div style={{ marginTop: "0.25rem" }}>{chat.suggestData}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

export default Analyze;
