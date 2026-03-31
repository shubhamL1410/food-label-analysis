
import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import TrafficLight, { getPredictionStatus } from "./TrafficLight/TrafficLight";
import HealthScoreRing from "./HealthScoreRing";
import PredictionResultCard from "./PredictionResultCard";
import ProfileModal from "./ProfileModal";

function Analyze({ isLoggedIn, navigateToLogin }) {
  const [image, setImage] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [labelType, setLabelType] = useState(isLoggedIn ? "" : "nutrition");
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState("");
  const [suggestionError, setSuggestionError] = useState("");
  const [isSuggestionLoading, setIsSuggestionLoading] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [lastExtractedText, setLastExtractedText] = useState("");
  const [lastModelPrediction, setLastModelPrediction] = useState("");
  const [lastLabelType, setLastLabelType] = useState("nutrition");
  const [lastHealthScore, setLastHealthScore] = useState(null);
  const [lastRawData, setLastRawData] = useState(null);
  const [isAnalyzeTextLoading, setIsAnalyzeTextLoading] = useState(false);
  const [geminiAnalysis, setGeminiAnalysis] = useState("");
  const [isSavingChat, setIsSavingChat] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const handleNavigateToLogin = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("jwtToken");
    if (navigateToLogin) navigateToLogin();
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem("jwtToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
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

  function getScoreTone(score) {
    if (!Number.isFinite(score)) return "pending";
    if (score >= 70) return "strong";
    if (score >= 50) return "balanced";
    return "watch";
  }

  function summarizeActivityMessage(message) {
    if (!message) return "";
    const compact = String(message).replace(/\s+/g, " ").trim();
    if (compact.length <= 180) return compact;
    return `${compact.slice(0, 177)}...`;
  }

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!isLoggedIn) setLabelType("nutrition");
  }, [isLoggedIn]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);

  const addMessage = (type, content, imgUrl = null, healthScore = null, predictionData = null) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), type, content, imageUrl: imgUrl, healthScore, predictionData },
    ]);
  };

  const safeParseJson = (value) => {
    if (!value || typeof value !== "string") return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      applySelectedImage(file);
    }
  };

  const applySelectedImage = (file) => {
    if (!file) return;
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }
    setImage(file);
    setImageUrl(URL.createObjectURL(file));
    setCameraError("");
  };

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const closeCamera = () => {
    stopCameraStream();
    setCameraOpen(false);
    setCameraError("");
    setIsCameraStarting(false);
  };

  const handleOpenCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera is not supported on this device or browser.");
      return;
    }

    setCameraOpen(true);
    setCameraError("");
    setIsCameraStarting(true);

    try {
      stopCameraStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      setCameraError("Unable to access camera. Please allow permission and try again.");
      stopCameraStream();
    } finally {
      setIsCameraStarting(false);
    }
  };

  const handleCapturePhoto = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
      setCameraError("Camera preview is not ready yet.");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError("Failed to capture photo. Please try again.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.92);
    });

    if (!blob) {
      setCameraError("Failed to capture photo. Please try again.");
      return;
    }

    const capturedFile = new File([blob], `camera-capture-${Date.now()}.jpg`, {
      type: "image/jpeg",
    });

    applySelectedImage(capturedFile);
    closeCamera();
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
    addMessage("user", `Analyze this ${backendLabelType} label`, imageUrl);

    const formData = new FormData();
    formData.append("image", image);
    if (isLoggedIn) formData.append("labelType", backendLabelType);

    const url = isLoggedIn ? "/api/analyze" : "/api/public/analyze/nutrition";
    const headers = isLoggedIn ? getAuthHeaders() : {};

    try {
      setIsLoading(true);
      const response = await fetch(url, { method: "POST", headers, body: formData });

      if (!response.ok) {
        const text = await response.text();
        const errMsg = text || `Request failed with status ${response.status}`;
        setError(errMsg);
        addMessage("assistant", `Error: ${errMsg}`);
        return;
      }

      const data = await response.json();
      const prediction = data.prediction || data.explanation || "Prediction unavailable";
      const healthScore = Number.isFinite(data.healthScore) ? data.healthScore : null;
      const parsedRawData = safeParseJson(data.rawResponse);

      addMessage("assistant", "", null, healthScore, {
        prediction,
        healthScore,
        labelType: backendLabelType,
        rawData: parsedRawData,
      });

      setHasAnalyzed(true);
      setLastExtractedText(data.rawResponse || prediction);
      setLastModelPrediction(prediction);
      setLastLabelType(backendLabelType);
      setLastHealthScore(healthScore);
      setLastRawData(parsedRawData);
    } catch (err) {
      const errMsg = err?.message || "Failed to reach server";
      setError(errMsg);
      addMessage("assistant", `Error: ${errMsg}`);
    } finally {
      setIsLoading(false);
    }
  };
  const handleAnalyzeWithGemini = async () => {
    if (!isLoggedIn) {
      setError("Please log in to analyze with Gemini.");
      return;
    }
    if (!lastExtractedText?.trim()) {
      setError("No extracted text available. Run an analysis first.");
      return;
    }

    addMessage("user", "Analyze this extracted label with Gemini");

    try {
      setIsAnalyzeTextLoading(true);
      const response = await fetch("/api/food/analyze-text", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ extractedText: lastExtractedText, labelType: lastLabelType }),
      });

      if (!response.ok) {
        const text = await response.text();
        setError(text || `Request failed with status ${response.status}`);
        addMessage("assistant", `Error: ${text || response.status}`);
        return;
      }

      const text = await response.text();
      setGeminiAnalysis(text);
      addMessage("assistant", `AI analysis of extracted label:\n\n${text}`);
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
        headers: getAuthHeaders(),
        body: formData,
      });

      if (!response.ok) {
        if (response.status === 403) {
          handleNavigateToLogin();
          return;
        }
        const text = await response.text();
        setSuggestionError(text || `Request failed (${response.status})`);
        addMessage("assistant", `Error: ${text || response.status}`);
        return;
      }

      const text = await response.text();
      setSuggestion(text);
      addMessage("assistant", `Suggestions:\n\n${text}`);
    } catch (err) {
      const errMsg = err?.message || "Failed to reach server";
      setSuggestionError(errMsg);
      addMessage("assistant", `Error: ${errMsg}`);
    } finally {
      setIsSuggestionLoading(false);
    }
  };

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

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
      if (!image) {
        setError("No image available to save");
        setIsSavingChat(false);
        return;
      }

      const imageDataUrl = await fileToBase64(image);

      const chatRequest = {
        image: imageDataUrl,
        type: lastLabelType || "nutrition",
        modelPrediction: lastModelPrediction || lastExtractedText || "",
        healthScore: lastHealthScore,
        analyzeData: geminiAnalysis || null,
        suggestData: suggestion || null,
      };

      const response = await fetch("/api/chat/save", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(chatRequest),
      });

      if (!response.ok) {
        let errorText;
        try {
          errorText = await response.text();
        } catch {
          errorText = `HTTP ${response.status}`;
        }
        setError(`Failed to save chat: ${errorText || response.status}`);
        addMessage("assistant", `Error saving chat: ${errorText || response.status}`);
        return;
      }

      await response.json();
      addMessage("assistant", "Workspace saved successfully. Starting a new analysis...");
      setTimeout(() => {
        handleResetChat();
      }, 1000);
    } catch (err) {
      setError(`Failed to save chat: ${err?.message || "Unknown error"}`);
    } finally {
      setIsSavingChat(false);
    }
  };

  const handleResetChat = () => {
    closeCamera();
    setImage(null);
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }
    setImageUrl(null);
    setLabelType(isLoggedIn ? "" : "nutrition");
    setMessages([]);
    setError("");
    setCameraError("");
    setSuggestion("");
    setSuggestionError("");
    setHasAnalyzed(false);
    setLastExtractedText("");
    setLastModelPrediction("");
    setLastLabelType("nutrition");
    setLastHealthScore(null);
    setLastRawData(null);
    setGeminiAnalysis("");
  };

  const anyLoading = isLoading || isSuggestionLoading || isAnalyzeTextLoading || isSavingChat;
  const scoreTone = getScoreTone(lastHealthScore);
  const activityEntries = messages.reduce((items, msg) => {
    if (msg.predictionData) {
      items.push({
        id: `${msg.id}-prediction`,
        type: "assistant",
        title: "Model prediction ready",
        text: `${msg.predictionData.prediction || "Prediction available"}${Number.isFinite(msg.predictionData.healthScore) ? ` • score ${Math.round(msg.predictionData.healthScore)}/100` : ""}`,
        imageUrl: null,
      });
      return items;
    }

    const summarized = summarizeActivityMessage(msg.content);
    if (!summarized) return items;

    items.push({
      id: msg.id,
      type: msg.type,
      title: msg.type === "user" ? "You" : "Assistant",
      text: summarized,
      imageUrl: msg.type === "user" ? msg.imageUrl : null,
    });
    return items;
  }, []);

  return (
    <div className="analyze-page">
      <div className="analyze-container">
        {isLoggedIn && (
          <div className="analyze-nav-links">
            <Link to="/viewchat" className="link-chats">
              View my chat history
            </Link>
            <button
              type="button"
              className="btn-profile"
              onClick={() => setProfileModalOpen(true)}
            >
              Update Profile
            </button>
          </div>
        )}

        <ProfileModal
          isOpen={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
          getAuthHeaders={getAuthHeaders}
        />

        <div className="analyze-card">
          <div className="analyze-workspace">
            <aside className="workspace-sidebar">
              <div className="workspace-sidebar-inner">
                <div className="workspace-hero">
                  <span className="workspace-badge">AI label workspace</span>
                  <h2>Food Label Analysis</h2>
                  <p>
                    {isLoggedIn
                      ? "Review the uploaded label, model verdict, health score, and extracted signals in one place."
                      : "Try nutrition label analysis in a cleaner workspace. Sign in to unlock ingredients and AI follow-up tools."}
                  </p>
                </div>

                <div className="workspace-upload-card">
                  <div className="workspace-section-head">
                    <div>
                      <span className="workspace-eyebrow">Source label</span>
                      <h3>Upload and preview</h3>
                    </div>
                    {image && <span className="workspace-chip">Ready</span>}
                  </div>

                  <div
                    className={`workspace-preview-shell ${imageUrl ? "has-image" : ""}`}
                    onClick={() => imageUrl && setPreviewImage(imageUrl)}
                  >
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt="Uploaded label"
                        className="workspace-preview-image"
                      />
                    ) : (
                      <div className="workspace-preview-placeholder">
                        <strong>Label preview</strong>
                        <span>Upload a nutrition or ingredient label to begin analysis.</span>
                      </div>
                    )}
                  </div>
                  <div className="analyze-input workspace-input-area">
                    {error && <div className="msg-error">{error}</div>}

                    {!hasAnalyzed ? (
                      <form onSubmit={handleSubmit} className="analyze-form">
                        <div className="input-row workspace-controls">
                          <label htmlFor="file-upload" className="btn-upload">
                            Choose Image
                          </label>
                          <input
                            id="file-upload"
                            type="file"
                            onChange={handleImageChange}
                            accept="image/*"
                            className="input-hidden"
                          />
                          <button
                            type="button"
                            className="btn-upload btn-camera"
                            onClick={handleOpenCamera}
                            disabled={anyLoading}
                          >
                            Open Camera
                          </button>

                          {isLoggedIn ? (
                            <select
                              value={labelType}
                              onChange={(e) => setLabelType(e.target.value)}
                              className="input-select"
                              required
                            >
                              <option value="">Select label type</option>
                              <option value="nutrition">Nutrition</option>
                              <option value="ingredient">Ingredients</option>
                            </select>
                          ) : (
                            <span className="input-badge">Nutrition only in guest mode</span>
                          )}

                          <button
                            type="submit"
                            className="btn-primary workspace-primary-cta"
                            disabled={anyLoading}
                          >
                            {isLoading ? (
                              <>
                                <span className="spinner" />
                                Analyzing...
                              </>
                            ) : (
                              "Run Analysis"
                            )}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="analyze-actions workspace-actions">
                        <div className="workspace-actions-head">
                          <p className="analyze-done">Analysis complete</p>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={handleResetChat}
                            disabled={anyLoading}
                          >
                            Start New Analysis
                          </button>
                        </div>
                        {isLoggedIn ? (
                          <div className="action-buttons">
                            <button
                              type="button"
                              className="btn-action btn-gemini"
                              onClick={handleAnalyzeWithGemini}
                              disabled={anyLoading || !!geminiAnalysis}
                            >
                              {isAnalyzeTextLoading ? (
                                <>
                                  <span className="spinner" />
                                  Analyzing...
                                </>
                              ) : (
                                "Analyze with Gemini"
                              )}
                            </button>
                            <button
                              type="button"
                              className="btn-action btn-suggest"
                              onClick={handleGetSuggestion}
                              disabled={anyLoading || !!suggestion}
                            >
                              {isSuggestionLoading ? (
                                <>
                                  <span className="spinner" />
                                  Getting suggestions...
                                </>
                              ) : (
                                "Get Suggestions"
                              )}
                            </button>
                            <button
                              type="button"
                              className="btn-action btn-save"
                              onClick={handleEndChat}
                              disabled={anyLoading}
                            >
                              {isSavingChat ? (
                                <>
                                  <span className="spinner" />
                                  Saving...
                                </>
                              ) : (
                                "Save Workspace"
                              )}
                            </button>
                          </div>
                        ) : (
                          <p className="analyze-signin">Sign in to unlock Gemini analysis, suggestions, and chat saving.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </aside>

            <section className="workspace-main">
              <div className="workspace-summary">
                <div className="workspace-summary-copy">
                  <span className="workspace-eyebrow">Current result</span>
                  <h3>{hasAnalyzed ? lastModelPrediction || "Prediction ready" : "Waiting for analysis"}</h3>
                  <p>
                    {hasAnalyzed
                      ? `Review the ${lastLabelType} label insights, extracted signals, and score without leaving this screen.`
                      : "Upload a label to generate a structured result panel with score and extracted details."}
                  </p>
                </div>
                <div className={`workspace-score-pill ${scoreTone}`}>
                  {Number.isFinite(lastHealthScore) ? (
                    <>
                      <strong>{Math.round(lastHealthScore)}</strong>
                      <span>Health score</span>
                    </>
                  ) : (
                    <>
                      <strong>--</strong>
                      <span>No score yet</span>
                    </>
                  )}
                </div>
              </div>

              <div className="workspace-grid">
                <div className="workspace-panel workspace-panel-primary">
                  <div className="workspace-section-head">
                    <div>
                      <span className="workspace-eyebrow">Prediction</span>
                      <h3>Decision panel</h3>
                    </div>
                  </div>

                  {hasAnalyzed ? (
                    <PredictionResultCard
                      prediction={lastModelPrediction}
                      healthScore={lastHealthScore}
                      labelType={lastLabelType}
                      rawData={lastRawData}
                    />
                  ) : (
                    <div className="workspace-empty">
                      <h4>No analysis yet</h4>
                      <p>The main prediction, score, and detected nutrients or ingredients will appear here.</p>
                    </div>
                  )}
                </div>

                <div className="workspace-panel-stack">
                  <div className="workspace-panel">
                    <div className="workspace-section-head">
                      <div>
                        <span className="workspace-eyebrow">Model score</span>
                        <h3>Health index</h3>
                      </div>
                    </div>
                    {Number.isFinite(lastHealthScore) ? (
                      <div className="workspace-score-card">
                        <HealthScoreRing score={lastHealthScore} size={132} />
                        <div>
                          <h4>{lastHealthScore >= 70 ? "Strong label profile" : lastHealthScore >= 50 ? "Moderate label profile" : "Needs attention"}</h4>
                          <p>
                            {lastHealthScore >= 70
                              ? "The model sees a generally favorable balance."
                              : lastHealthScore >= 50
                                ? "The label is mixed and worth reviewing closely."
                                : "The model found multiple concerns in this label."}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="workspace-empty compact">
                        <p>Health score will appear after the first successful analysis.</p>
                      </div>
                    )}
                  </div>

                </div>
              </div>

              <div className="workspace-panel workspace-followup-panel">
                <div className="workspace-section-head">
                  <div>
                    <span className="workspace-eyebrow">AI follow-up</span>
                    <h3>Gemini and suggestions</h3>
                  </div>
                </div>

                <div className="workspace-followup-grid">
                  <div className="workspace-note-card workspace-note-card-wide">
                    <h4>Gemini analysis</h4>
                    <p>{geminiAnalysis || "Run Gemini analysis to generate a richer explanation from the extracted label text."}</p>
                  </div>
                  <div className="workspace-note-card workspace-note-card-side">
                    <h4>Suggestions</h4>
                    <p>{suggestion || suggestionError || "Suggestions will appear here after you request personalized guidance."}</p>
                  </div>
                </div>
              </div>

              <div className="workspace-panel workspace-activity-panel">
                <div className="workspace-section-head">
                  <div>
                    <span className="workspace-eyebrow">Trace</span>
                    <h3>Activity log</h3>
                  </div>
                </div>

                <div className="chat-messages workspace-log">
                  {activityEntries.length === 0 && (
                    <div className="workspace-activity-empty">
                      Upload a label image and the key actions in this session will appear here.
                    </div>
                  )}

                  {activityEntries.map((entry) => {
                    const predictionStatus = entry.type === "assistant" && entry.title === "Model prediction ready"
                      ? getPredictionStatus(entry.text)
                      : null;
                    return (
                      <div key={entry.id} className={`workspace-activity-item ${entry.type}`}>
                        <div className="workspace-activity-meta">
                          <span className="workspace-activity-title">{entry.title}</span>
                          {predictionStatus && <TrafficLight status={predictionStatus} />}
                        </div>
                        <div className="workspace-activity-text">{entry.text}</div>
                        {entry.imageUrl && (
                          <img
                            src={entry.imageUrl}
                            alt="Uploaded label"
                            className="workspace-activity-thumb"
                            onClick={() => setPreviewImage(entry.imageUrl)}
                          />
                        )}
                      </div>
                    );
                  })}

                  {anyLoading && (
                    <div className="workspace-activity-item assistant pending">
                      <div className="workspace-activity-meta">
                        <span className="workspace-activity-title">Processing</span>
                      </div>
                      <div className="msg-content msg-loading">
                        <span className="spinner" />
                        {(isLoading && "Analyzing your food label...") ||
                          (isSuggestionLoading && "Getting suggestions...") ||
                          (isAnalyzeTextLoading && "Analyzing with Gemini...") ||
                          (isSavingChat && "Saving chat...")}
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>
            </section>
          </div>

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
                x
              </button>
            </div>
          )}

          {cameraOpen && (
            <div className="camera-overlay" onClick={closeCamera}>
              <div className="camera-modal" onClick={(e) => e.stopPropagation()}>
                <div className="camera-modal-header">
                  <h3>Capture Label Photo</h3>
                  <button
                    type="button"
                    className="camera-close"
                    onClick={closeCamera}
                    aria-label="Close camera"
                  >
                    x
                  </button>
                </div>

                <div className="camera-preview-shell">
                  <video
                    ref={videoRef}
                    className="camera-preview"
                    autoPlay
                    playsInline
                    muted
                  />
                  {isCameraStarting && (
                    <div className="camera-status">Starting camera...</div>
                  )}
                  {cameraError && (
                    <div className="camera-status camera-status-error">{cameraError}</div>
                  )}
                </div>

                <div className="camera-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={closeCamera}
                  >
                    Close Camera
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleCapturePhoto}
                    disabled={isCameraStarting}
                  >
                    Capture Image
                  </button>
                </div>
                <canvas ref={canvasRef} className="camera-canvas-hidden" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Analyze;
