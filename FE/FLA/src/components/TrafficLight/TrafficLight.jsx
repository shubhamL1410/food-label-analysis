import "./TrafficLight.css"

export function getPredictionStatus(text) {
  if (!text || typeof text !== "string") return null;

  let parsedText = text;

  // Try parsing JSON safely
  try {
    const obj = JSON.parse(text);
    if (obj.prediction) {
      parsedText = obj.prediction;
    }
  } catch (e) {
    // Not JSON, ignore
  }

  const lower = String(parsedText).toLowerCase();

  // Check "unhealthy" before "healthy" to avoid substring collision.
  if (/\bunhealthy\b/.test(lower)) return "unhealthy";
  if (/\bmoderate\b/.test(lower)) return "moderate";
  if (/\bhealthy\b/.test(lower)) return "healthy";

  return null;
}

function TrafficLight({ status }) {
  if (!status) return null;

  return (
    <div className="nutrition-score" aria-label={`Prediction: ${status}`}>
      <div className={`score-box healthy ${status === "healthy" ? "active" : ""}`}>
        Healthy
      </div>
      <div className={`score-box moderate ${status === "moderate" ? "active" : ""}`}>
        Moderate
      </div>
      <div className={`score-box unhealthy ${status === "unhealthy" ? "active" : ""}`}>
        Unhealthy
      </div>
    </div>
  );
}

export default TrafficLight;
