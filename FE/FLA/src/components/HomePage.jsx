function HomePage({ isLoggedIn, onStart }) {
  return (
    <div className="home-page">
      <h1>Food Label Analysis</h1>
      <p className="home-description">
        {isLoggedIn
          ? "Upload nutrition or ingredients labels, get analysis, and ask Gemini for suggestions."
          : "Try it free: analyze a nutrition label image. Sign in for ingredients analysis and AI suggestions."}
      </p>
      <button className="start-button" onClick={onStart}>
        {isLoggedIn ? "Analyze labels" : "Try nutrition analysis"}
      </button>
    </div>
  );
}

export default HomePage;
