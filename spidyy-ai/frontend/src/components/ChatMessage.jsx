// role is "user", "assistant", or "error" - it is also used as a CSS class.
export default function ChatMessage({ role, text }) {
  return <div className={`message ${role}`}>{text}</div>;
}
