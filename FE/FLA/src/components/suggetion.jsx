import { useState } from "react";
import { apiFetch } from "../services/api";

function Suggetion() {
  const [image, setImage] = useState(null);
  const [suggestion, setSuggestion] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuggestion("");

    if (!image) {
      setError("Image file is required");
      return;
    }

    const formData = new FormData();
    // MUST match backend controller: @RequestParam("image") MultipartFile image
    formData.append("image", image);

    try {
      setIsLoading(true);

      const response = await apiFetch("/api/food/suggest", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const text = await response.text();
        setError(text || `Request failed with status ${response.status}`);
        return;
      }

      const text = await response.text();
      setSuggestion(text);
    } catch (err) {
      setError(err?.message || "Failed to reach server");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2>Food Suggestion</h2>

      <form onSubmit={handleSubmit}>
        <input
          type="file"
          onChange={(e) => setImage(e.target.files?.[0] || null)}
          required
        />

        <button type="submit" disabled={isLoading}>
          {isLoading ? "Getting suggestion..." : "Get Suggestion"}
        </button>
      </form>

      {error && (
        <div>
          <p>{error}</p>
        </div>
      )}

      {suggestion && (
        <div>
          <h3>Suggestion:</h3>
          <p>{suggestion}</p>
        </div>
      )}
    </div>
  );
}

export default Suggetion; 
