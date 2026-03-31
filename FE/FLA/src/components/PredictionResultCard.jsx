import TrafficLight, { getPredictionStatus } from "./TrafficLight/TrafficLight";
import HealthScoreRing from "./HealthScoreRing";

function prettifyKey(value = "") {
  return String(value)
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getImpactType(score) {
  if (!Number.isFinite(score) || score === 0) return "bad";
  if (score > 0) return "good";
  if (score <= -8) return "harmful";
  return "bad";
}

function formatBand(band = "") {
  return String(band).replace(/_/g, " ");
}

function PredictionResultCard({ prediction, healthScore, rawData, labelType }) {
  const status = getPredictionStatus(prediction || "");
  const scoreBreakdown = Array.isArray(rawData?.score_breakdown) ? rawData.score_breakdown : [];

  const ingredientScoresByName = new Map(
    scoreBreakdown
      .filter((item) => item && typeof item.ingredient === "string")
      .map((item) => [item.ingredient, Number(item.score) || 0])
  );

  const detectedIngredients = Array.isArray(rawData?.ingredients_detected)
    ? rawData.ingredients_detected
    : [];

  const nutritionRows = scoreBreakdown.filter(
    (item) => item && typeof item.nutrient === "string"
  );

  return (
    <div className="prediction-card">
      <div className="prediction-card-header">
        <div className="prediction-card-meta">
          <span className="prediction-card-title">Model Prediction</span>
          <h4>{prediction || "Unknown"}</h4>
          {status && <TrafficLight status={status} />}
        </div>
        {Number.isFinite(healthScore) && (
          <div className="prediction-card-score">
            <HealthScoreRing score={healthScore} size={96} />
          </div>
        )}
      </div>

      {labelType === "ingredient" && detectedIngredients.length > 0 && (
        <section className="prediction-section">
          <h5>Detected Ingredients</h5>
          <div className="prediction-tags">
            {detectedIngredients.map((name) => {
              const score = ingredientScoresByName.get(name) ?? 0;
              const type = getImpactType(score);
              return (
                <span key={name} className={`prediction-tag ${type}`}>
                  {prettifyKey(name)} · {type}
                </span>
              );
            })}
          </div>
        </section>
      )}

      {labelType === "nutrition" && nutritionRows.length > 0 && (
        <section className="prediction-section">
          <h5>Nutrition Signals</h5>
          <div className="prediction-grid">
            {nutritionRows.map((row) => {
              const score = Number(row.score) || 0;
              const type = getImpactType(score);
              return (
                <div key={row.nutrient} className="prediction-grid-item">
                  <div className="prediction-grid-top">
                    <span className="prediction-grid-name">{prettifyKey(row.nutrient)}</span>
                    <span className={`prediction-tag ${type}`}>{type}</span>
                  </div>
                  <div className="prediction-grid-sub">
                    band: {formatBand(row.band)} | value: {row.value}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

export default PredictionResultCard;
