import { useState } from "react";

export default function ChatInput({ onSend, disabled }) {
  const [text, setText] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    const question = text.trim();
    if (!question || disabled) return;
    onSend(question);
    setText("");
  }

  return (
    <form className="chat-input" onSubmit={handleSubmit}>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ask a question..."
        maxLength={2000}
      />
      <button type="submit" disabled={disabled || !text.trim()}>
        Ask
      </button>
    </form>
  );
}
