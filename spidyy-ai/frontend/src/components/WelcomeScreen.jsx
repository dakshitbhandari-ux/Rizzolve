const EXAMPLES = [
  "Why is the sky blue?",
  "Explain photosynthesis for a class 8 student.",
  "What is the difference between TCP and UDP?",
];

export default function WelcomeScreen({ onPick }) {
  return (
    <div className="welcome">
      <h2>What would you like to learn today?</h2>
      <p>Try one of these, or type your own question below.</p>
      <div className="examples">
        {EXAMPLES.map((q) => (
          <button key={q} onClick={() => onPick(q)}>
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
