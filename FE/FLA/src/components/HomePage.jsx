function HomePage({ onStart }) {
  return (
    <div className="home-page">
      <h1>Food Label Analysis</h1>
      <button className="start-button" onClick={onStart}>
        Start
      </button>
    </div>
  );
}

export default HomePage;
