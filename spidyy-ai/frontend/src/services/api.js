// All calls from the frontend to the FastAPI backend live in this file.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// Sends a request and returns the JSON body, or throws an Error with a message the UI can show.
async function request(path, options) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, options);
  } catch (err) {
    if (err.name === "AbortError") throw err; // cancelled on purpose, not a network problem
    throw new Error("Cannot reach the backend. Is it running on " + API_BASE_URL + "?");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    // FastAPI puts error messages in "detail" (a string, or a list for validation errors).
    const detail = typeof data.detail === "string" ? data.detail : "Request failed.";
    throw new Error(detail);
  }
  return data;
}

export async function askQuestion(question) {
  const data = await request("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  return data.answer;
}

// Returns { questions: [{ id, question, count, first_asked_at, last_asked_at }], min_count, storage }.
export function getMostAskedQuestions(limit = 10, signal) {
  return request(`/api/questions/most-asked?limit=${encodeURIComponent(limit)}`, { signal });
}
