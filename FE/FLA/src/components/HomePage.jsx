import { Link } from "react-router-dom";

function HomePage({ isLoggedIn }) {
  return (
    <div>
      <div className="home-hero">
        <div className="home-content">
          <div className="home-badge">Smart Nutrition Scanner</div>
          <h1 className="home-title">
            Understand Your Food Labels
            <span className="home-title-accent"> in Seconds</span>
          </h1>
          <p className="home-subtitle">
            Upload nutrition or ingredient labels, get instant AI-powered analysis,
            personalized suggestions, and save your history for later.
          </p>

          <div className="home-features">
            <div className="home-feature">
              <span className="home-feature-icon">📷</span>
              <span>Upload label images</span>
            </div>
            <div className="home-feature">
              <span className="home-feature-icon">🧠</span>
              <span>AI prediction & analysis</span>
            </div>
            <div className="home-feature">
              <span className="home-feature-icon">💡</span>
              <span>Personalized suggestions</span>
            </div>
            <div className="home-feature">
              <span className="home-feature-icon">📋</span>
              <span>Save & view chat history</span>
            </div>
          </div>

          <div className="home-cta">
            <>
              <Link to="/login" className="home-btn home-btn-primary">
                Login
              </Link>
              <Link to="/register" className="home-btn home-btn-secondary">
                Create Account
              </Link>
              <Link to="/admin/login" className="home-btn home-btn-secondary">
                Admin Panel
              </Link>
            </>
          </div>
        </div>
      </div>

      <footer className="home-footer">
        <div className="home-footer-inner">
          <div className="home-footer-brand">
            <h3>Food Label Analysis</h3>
            <p>
              AI-powered nutrition and ingredient intelligence for healthier food choices.
            </p>
          </div>

          <div className="home-footer-col">
            <h4>Platform</h4>
            <Link to="/analyze">Analyze Labels</Link>
            <Link to="/viewchat">My Chat History</Link>
            <Link to="/admin/login">Admin Panel</Link>
          </div>

          <div className="home-footer-col">
            <h4>Features</h4>
            <span>Nutrition & Ingredient Scoring</span>
            <span>Gemini Food Analysis</span>
            <span>BMI-Based Suggestions</span>
          </div>

          <div className="home-footer-col">
            <h4>Support</h4>
            <span>Email:foodlabelanalysis@gmail.com</span>
            <span>Security: JWT + OTP</span>
            <span>Version: 1.0</span>
          </div>
        </div>

        <div className="home-footer-bottom">
          <span>© 2026 Food Label Analysis. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;
