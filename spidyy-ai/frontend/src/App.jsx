import { useState } from "react";
import Header from "./components/Header.jsx";
import WelcomeScreen from "./components/WelcomeScreen.jsx";
import ChatMessage from "./components/ChatMessage.jsx";
import ChatInput from "./components/ChatInput.jsx";
import MostAskedQuestions from "./components/MostAskedQuestions.jsx";
import { askQuestion } from "./services/api.js";

// The backend counts a question just after sending its answer, so reload the list a moment later.
const RECOUNT_DELAY_MS = 1500;

export default function App() {
  // Each message: { role: "user" | "assistant" | "error", text: string }
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statsVersion, setStatsVersion] = useState(0);

  async function handleSend(question) {
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setLoading(true);
    try {
      const answer = await askQuestion(question);
      setMessages((prev) => [...prev, { role: "assistant", text: answer }]);
      setTimeout(() => setStatsVersion((v) => v + 1), RECOUNT_DELAY_MS);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "error", text: err.message }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <Header />
      <MostAskedQuestions refreshKey={statsVersion} />
      <main className="chat">
        {messages.length === 0 ? (
          <WelcomeScreen onPick={handleSend} />
        ) : (
          messages.map((m, i) => <ChatMessage key={i} role={m.role} text={m.text} />)
        )}
        {loading && <ChatMessage role="assistant" text="Thinking..." />}
      </main>
      <ChatInput onSend={handleSend} disabled={loading} />
    </div>
  );
}
