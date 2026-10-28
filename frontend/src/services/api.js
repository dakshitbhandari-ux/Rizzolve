// API service connecting Frontend to the FastAPI Backend (Spidyy AI Copilot)
const ENV_API_URL = import.meta.env.VITE_API_BASE_URL;

// Candidate URLs in priority order: Vite proxy -> direct IPv4 loopback -> direct localhost
const CANDIDATE_URLS = ENV_API_URL
  ? [ENV_API_URL]
  : ['', 'http://127.0.0.1:8000', 'http://localhost:8000'];

let verifiedBaseUrl = null;

async function request(path, options = {}) {
  // If we already verified a working base URL, try that first
  const urlsToTry = verifiedBaseUrl !== null
    ? [verifiedBaseUrl, ...CANDIDATE_URLS.filter((u) => u !== verifiedBaseUrl)]
    : CANDIDATE_URLS;

  let lastError = null;

  for (const base of urlsToTry) {
    try {
      const fullUrl = `${base}${path}`;
      const response = await fetch(fullUrl, options);

      // If gateway error from proxy, fallback to direct backend
      if (response.status === 502 || response.status === 504) {
        continue;
      }

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = typeof data.detail === 'string' ? data.detail : `Request failed with status ${response.status}`;
        throw new Error(detail);
      }

      // Mark this base URL as successfully verified
      verifiedBaseUrl = base;
      return data;
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      // If it's a validation error or known detail message from backend, re-throw immediately
      if (err.message && !err.message.includes('fetch') && !err.message.includes('NetworkError') && !err.message.includes('Failed to fetch')) {
        throw err;
      }
      lastError = err;
    }
  }

  throw new Error(
    lastError?.message ||
    'Cannot reach AI backend server at http://127.0.0.1:8000. Please ensure the Python server is running.'
  );
}

export async function checkBackendHealth() {
  return request('/api/health');
}

export async function askAiQuestion(question) {
  const data = await request('/api/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });
  return data.answer;
}

export async function getMostAskedQuestions(limit = 10, signal) {
  return request(`/api/questions/most-asked?limit=${encodeURIComponent(limit)}`, { signal });
}

// ---------- Shared Doubts API (Multi-User Persistence) ----------

export async function fetchDoubts() {
  return request('/api/doubts');
}

export async function createDoubt(doubt) {
  return request('/api/doubts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(doubt),
  });
}

export async function toggleUpvoteDoubt(doubtId, userId) {
  return request(`/api/doubts/${encodeURIComponent(doubtId)}/upvote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
}

export async function submitDoubtAnswer(doubtId, answer) {
  return request(`/api/doubts/${encodeURIComponent(doubtId)}/answers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(answer),
  });
}

export async function acceptDoubtAnswer(doubtId, answerId) {
  return request(`/api/doubts/${encodeURIComponent(doubtId)}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answerId }),
  });
}
