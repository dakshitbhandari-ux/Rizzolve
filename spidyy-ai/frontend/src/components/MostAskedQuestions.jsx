import { useCallback, useEffect, useRef, useState } from "react";
import { getMostAskedQuestions } from "../services/api.js";

const LIMIT = 10;

// The most frequently asked question groups, live from the backend.
// `refreshKey` changes after each answered question, which reloads the list.
// On wide screens it sits to the right of the chat; on small screens it is a collapsible card.
export default function MostAskedQuestions({ refreshKey }) {
  // status: "loading" | "ready" | "error". `data` keeps the last good list while reloading.
  const [state, setState] = useState({ status: "loading", data: null, error: "" });
  const [open, setOpen] = useState(false); // small screens only
  const requestRef = useRef(null);

  const load = useCallback(async () => {
    requestRef.current?.abort(); // a newer request replaces an older, slower one
    const controller = new AbortController();
    requestRef.current = controller;
    setState((s) => ({ ...s, status: "loading", error: "" }));
    try {
      const data = await getMostAskedQuestions(LIMIT, controller.signal);
      setState({ status: "ready", data, error: "" });
    } catch (err) {
      if (err.name === "AbortError") return;
      setState((s) => ({ ...s, status: "error", error: err.message }));
    }
  }, []);

  useEffect(() => {
    load();
    return () => requestRef.current?.abort();
  }, [load, refreshKey]);

  const { status, data, error } = state;
  const loading = status === "loading";

  return (
    <aside className={`most-asked${open ? " open" : ""}`} aria-labelledby="most-asked-title">
      <div className="most-asked-header">
        <h2 id="most-asked-title">Most asked questions</h2>
        <div className="most-asked-actions">
          <button
            type="button"
            className="most-asked-toggle"
            aria-expanded={open}
            aria-controls="most-asked-body"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? "Hide" : "Show"}
          </button>
          <button type="button" className="most-asked-refresh" onClick={load} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      <div id="most-asked-body" className="most-asked-body" aria-live="polite" aria-busy={loading}>
        {!data && loading && <p className="most-asked-note">Loading...</p>}

        {status === "error" && (
          <div className="most-asked-error" role="alert">
            <p>Could not load the most asked questions: {error}</p>
            <button type="button" onClick={load}>
              Try again
            </button>
          </div>
        )}

        {data && data.questions.length === 0 && (
          <p className="most-asked-note">
            {data.min_count > 1
              ? `No question has been asked ${data.min_count} or more times yet.`
              : "No questions have been asked yet."}
          </p>
        )}

        {data && data.questions.length > 0 && (
          <ol className="most-asked-list">
            {data.questions.map((q) => (
              <li key={q.id}>
                <span className="most-asked-question" title={q.question}>
                  {q.question}
                </span>
                <span className="most-asked-count">
                  Asked {q.count} {q.count === 1 ? "time" : "times"}
                </span>
              </li>
            ))}
          </ol>
        )}

        {data?.storage === "memory" && (
          <p className="most-asked-note small">Counted since the server started (no database configured).</p>
        )}
      </div>
    </aside>
  );
}
