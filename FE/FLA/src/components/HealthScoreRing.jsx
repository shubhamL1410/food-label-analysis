function getScoreTone(score) {
  if (score >= 70) return "healthy";
  if (score >= 50) return "moderate";
  return "unhealthy";
}

function HealthScoreRing({ score, size = 96, stroke = 10 }) {
  if (!Number.isFinite(score)) return null;

  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const tone = getScoreTone(clamped);

  return (
    <div className={`health-score-ring ${tone}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Health score ${clamped} out of 100`}>
        <circle
          className="health-score-ring-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          className="health-score-ring-progress"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="health-score-ring-center">
        <strong>{clamped}</strong>
        <span>/100</span>
      </div>
    </div>
  );
}

export default HealthScoreRing;
