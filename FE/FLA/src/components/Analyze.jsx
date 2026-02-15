import { useState, useRef, useEffect } from "react";

function Analyze({ navigateToLogin }) {
  const [image, setImage] = useState(null);
  const [labelType, setLabelType] = useState("");
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState("");
  const [suggestionError, setSuggestionError] = useState("");
  const [isSuggestionLoading, setIsSuggestionLoading] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const messagesEndRef = useRef(null);

  // Enhanced navigation function that clears token and navigates
  const handleNavigateToLogin = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("jwtToken");
    if (navigateToLogin) {
      navigateToLogin();
    }
  };

  // Get JWT token for authenticated requests
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

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (type, content, imageUrl = null) => {
    setMessages(prev => [...prev, { id: Date.now(), type, content, imageUrl }]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuggestion("");
    setSuggestionError("");

    if (!image) {
      setError("Please select an image first");
      return;
    }

    if (!labelType || !labelType.trim()) {
      setError("Please enter a label type");
      return;
    }

    // Add user message
    const userMessage = `Analyze this ${labelType} label`;
    addMessage("user", userMessage, URL.createObjectURL(image));

    const formData = new FormData();
    formData.append("image", image);
    formData.append("labelType", labelType);

    try {
      setIsLoading(true);
      const response = await fetch("/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const text = await response.text();
        setError(text || `Request failed with status ${response.status}`);
        addMessage("assistant", `Error: ${text || `Request failed with status ${response.status}`}`);
        return;
      }

      const data = await response.json();
      const analysisMessage = `**Rating:** ${data.rating}\n\n**Analysis:** ${data.explanation}`;
      addMessage("assistant", analysisMessage);
      setHasAnalyzed(true);
    } catch (error) {
      const errorMessage = error?.message || "Failed to reach server";
      setError(errorMessage);
      addMessage("assistant", `Error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetSuggestion = async () => {
    setSuggestion("");
    setSuggestionError("");

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
          // Redirect to login page for unauthorized access
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

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h3>🍎 Food Label Analysis Chat</h3>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="message assistant">
            <div className="message-content">
              👋 Hello! I'm your food label analysis assistant. Upload an image of a food label and tell me what type it is, and I'll analyze it for you!
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

        {(isLoading || isSuggestionLoading) && (
          <div className="message assistant">
            <div className="message-content">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="loading-spinner"></div>
                {isLoading ? "Analyzing your food label..." : "Getting suggestions..."}
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
                  onChange={(e) => setImage(e.target.files[0])}
                  accept="image/*"
                  className="file-input"
                />
              </div>

              <input
                type="text"
                placeholder="e.g., Nutrition Facts, Ingredients List"
                value={labelType}
                onChange={(e) => setLabelType(e.target.value)}
                className="text-input"
                required
              />

              <button 
                type="submit" 
                className="send-button" 
                disabled={isLoading || isSuggestionLoading}
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
              ✅ Analysis complete! You can now ask for suggestions.
            </p>
          </div>
        )}

        {messages.length > 0 && messages.some(m => m.type === 'assistant' && m.content.includes('Rating:')) && (
          <button 
            type="button" 
            className="suggestion-button" 
            onClick={handleGetSuggestion} 
            disabled={isSuggestionLoading || isLoading}
          >
            {isSuggestionLoading ? (
              <>
                <div className="loading-spinner"></div>
                Getting suggestions...
              </>
            ) : "💡 Get Suggestions"}
          </button>
        )}
      </div>
    </div>
  );
}

export default Analyze;
